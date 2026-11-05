import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  connectToDatabase,
  getLastMongoDiagnostic,
  getMongoUri,
} from "@/lib/mongodb";
import { SyncRecordModel } from "@/models";
import { checkDistributedRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ENTITIES = new Set([
  "transaction",
  "crop",
  "land",
  "labour",
  "vehicle",
  "reminder",
  "loan",
  "inventory",
  "family",
  "category",
  "cropsale",
]);

const MAX_CHANGES_PER_REQUEST = 50;
const MAX_RECORD_BYTES = 400_000;
const MAX_PULL_RECORDS = 10_000;
const MAX_REQUESTS_PER_WINDOW = 120;
const MAX_ALLOWED_FUTURE_DRIFT_MS = 5 * 60 * 1000; // 5 minutes tolerance for client clock skew

function ownerFromToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 40);
}

function rateKeyFromToken(token: string, prefix: "get" | "post"): string {
  const hash = createHash("sha256").update(token).digest("hex").slice(0, 32);
  return `${prefix}_${hash}`;
}

function isValidToken(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 20 &&
    value.length <= 40 &&
    !Number.isNaN(Date.parse(value))
  );
}

function isDataPayloadEqual(a: unknown, b: unknown): boolean {
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const cleanA = { ...(a as Record<string, unknown>) };
  delete cleanA.dirty;
  delete cleanA.version;
  delete cleanA.baseVersion;
  const cleanB = { ...(b as Record<string, unknown>) };
  delete cleanB.dirty;
  delete cleanB.version;
  delete cleanB.baseVersion;
  return JSON.stringify(cleanA) === JSON.stringify(cleanB);
}

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!isValidToken(token)) {
    return NextResponse.json(
      { success: false, error: "A valid private sync key is required." },
      { status: 401 }
    );
  }

  const rateKey = rateKeyFromToken(token, "get");
  const rateLimit = await checkDistributedRateLimit(rateKey, MAX_REQUESTS_PER_WINDOW, 60);
  const rateHeaders = {
    "X-RateLimit-Limit": String(rateLimit.limit),
    "X-RateLimit-Remaining": String(rateLimit.remaining),
    "X-RateLimit-Reset": String(rateLimit.reset),
    "X-RateLimit-Provider": rateLimit.provider,
  };

  if (!rateLimit.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait a moment." },
      { status: 429, headers: rateHeaders }
    );
  }

  if (!getMongoUri()) {
    return NextResponse.json(
      {
        success: true,
        configured: false,
        database: "local",
        collection: "none",
        cloudRecordsCount: 0,
        serverTime: new Date().toISOString(),
      },
      { headers: rateHeaders }
    );
  }

  const connection = await connectToDatabase();
  if (!connection) {
    const diag = getLastMongoDiagnostic();
    return NextResponse.json(
      {
        success: false,
        configured: true,
        code: diag?.code || "ERR_DATABASE_UNAVAILABLE",
        error: diag?.message || "Cloud database is unavailable.",
      },
      { status: 503, headers: rateHeaders }
    );
  }

  const ownerId = ownerFromToken(token);
  const cloudRecordsCount = await SyncRecordModel.countDocuments({ ownerId });
  const database = connection.connection.name || "personal_bank";
  const collection = SyncRecordModel.collection.name || "syncrecords";

  return NextResponse.json(
    {
      success: true,
      configured: true,
      database,
      collection,
      cloudRecordsCount,
      rateLimiting: {
        provider: rateLimit.provider,
        distributed: rateLimit.provider === "upstash",
      },
      serverTime: new Date().toISOString(),
    },
    { headers: rateHeaders }
  );
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!isValidToken(token)) {
    return NextResponse.json(
      { success: false, error: "A valid private sync key is required." },
      { status: 401 }
    );
  }

  const rateKey = rateKeyFromToken(token, "post");
  const rateLimit = await checkDistributedRateLimit(rateKey, MAX_REQUESTS_PER_WINDOW, 60);
  const rateHeaders = {
    "X-RateLimit-Limit": String(rateLimit.limit),
    "X-RateLimit-Remaining": String(rateLimit.remaining),
    "X-RateLimit-Reset": String(rateLimit.reset),
    "X-RateLimit-Provider": rateLimit.provider,
  };

  if (!rateLimit.success) {
    return NextResponse.json(
      { success: false, error: "Too many sync requests. Please wait a moment." },
      { status: 429, headers: rateHeaders }
    );
  }

  let body: {
    changes?: unknown;
    since?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid sync request." },
      { status: 400, headers: rateHeaders }
    );
  }

  const changes = Array.isArray(body.changes) ? body.changes : [];
  if (changes.length > MAX_CHANGES_PER_REQUEST) {
    return NextResponse.json(
      { success: false, error: "Too many changes in one sync request." },
      { status: 413, headers: rateHeaders }
    );
  }

  if (!getMongoUri()) {
    return NextResponse.json(
      {
        success: true,
        configured: false,
        records: [],
        serverTime: new Date().toISOString(),
      },
      { headers: rateHeaders }
    );
  }

  const connection = await connectToDatabase();
  if (!connection) {
    const diag = getLastMongoDiagnostic();
    return NextResponse.json(
      {
        success: false,
        configured: true,
        code: diag?.code || "ERR_DATABASE_UNAVAILABLE",
        error: diag?.message || "Cloud database is unavailable.",
      },
      { status: 503, headers: rateHeaders }
    );
  }

  const ownerId = ownerFromToken(token);
  const applied: string[] = [];
  const rejected: {
    id?: string;
    reason: string;
    serverVersion?: number;
    serverRecord?: unknown;
  }[] = [];

  const serverNow = new Date();
  const serverNowMs = serverNow.getTime();
  const serverNowIso = serverNow.toISOString();

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[Sync] Incoming request for owner ${ownerId.slice(0, 8)}… with ${changes.length} change(s).`
    );
  }

  for (const rawChange of changes) {
    if (!rawChange || typeof rawChange !== "object") {
      rejected.push({ reason: "Malformed change." });
      continue;
    }
    const change = rawChange as {
      id?: unknown;
      entity?: unknown;
      updatedAt?: unknown;
      baseVersion?: unknown;
      data?: unknown;
    };

    const id = typeof change.id === "string" ? change.id : "";
    const entity = typeof change.entity === "string" ? change.entity : "";
    if (!id || id.length > 120) {
      rejected.push({ id, reason: "Invalid record id." });
      continue;
    }
    if (!ALLOWED_ENTITIES.has(entity)) {
      rejected.push({ id, reason: "Unknown record type." });
      continue;
    }
    if (!isIsoTimestamp(change.updatedAt)) {
      rejected.push({ id, reason: "Invalid update timestamp." });
      continue;
    }
    if (!change.data || typeof change.data !== "object" || Array.isArray(change.data)) {
      rejected.push({ id, reason: "Invalid record data." });
      continue;
    }

    // --- Clock-skew defense: Clamp future-dated client timestamps ---
    const clientUpdatedMs = Date.parse(change.updatedAt);
    const isFutureDated = clientUpdatedMs > serverNowMs + MAX_ALLOWED_FUTURE_DRIFT_MS;
    const effectiveUpdatedAt = isFutureDated ? serverNowIso : change.updatedAt;

    const data = { ...(change.data as Record<string, unknown>) };
    data.id = id;
    data.entity = entity;
    data.ownerId = ownerId;
    data.updatedAt = effectiveUpdatedAt;
    delete data.dirty;
    delete data.baseVersion;

    const serialized = JSON.stringify(data);
    if (serialized.length > MAX_RECORD_BYTES) {
      rejected.push({ id, reason: "Record is too large." });
      continue;
    }

    const existing = await SyncRecordModel.findOne({ ownerId, recordId: id })
      .select({ updatedAt: 1, version: 1, data: 1 })
      .lean<{
        updatedAt: string;
        version?: number;
        data?: Record<string, unknown>;
      } | null>();

    if (existing) {
      const currentVersion = typeof existing.version === "number" ? existing.version : 1;
      const existingUpdatedMs = Date.parse(existing.updatedAt);
      const existingIsFutureCorrupt =
        existingUpdatedMs > serverNowMs + MAX_ALLOWED_FUTURE_DRIFT_MS;

      // Idempotency: exact same data payload already synced
      if (isDataPayloadEqual(data, existing.data)) {
        applied.push(id);
        continue;
      }

      // Conflict detection via monotonic versioning or timestamp fallback
      if (typeof change.baseVersion === "number") {
        if (change.baseVersion < currentVersion) {
          const serverPayload = {
            ...(existing.data || {}),
            version: currentVersion,
          };
          rejected.push({
            id,
            reason: "CONFLICT_MODIFIED_BY_OTHER_DEVICE",
            serverVersion: currentVersion,
            serverRecord: serverPayload,
          });
          continue;
        }
      } else if (!existingIsFutureCorrupt && existing.updatedAt > change.updatedAt) {
        rejected.push({ id, reason: "A newer version already exists." });
        continue;
      }

      const nextVersion = currentVersion + 1;
      data.version = nextVersion;

      await SyncRecordModel.findOneAndUpdate(
        { ownerId, recordId: id },
        {
          $set: {
            entity,
            updatedAt: effectiveUpdatedAt,
            version: nextVersion,
            serverUpdatedAt: serverNow,
            data,
            lastSeenAt: serverNow,
          },
        },
        { upsert: true, returnDocument: "after" }
      );
      applied.push(id);
    } else {
      // First insert
      const nextVersion = 1;
      data.version = nextVersion;

      await SyncRecordModel.findOneAndUpdate(
        { ownerId, recordId: id },
        {
          $set: {
            entity,
            updatedAt: effectiveUpdatedAt,
            version: nextVersion,
            serverUpdatedAt: serverNow,
            data,
            lastSeenAt: serverNow,
          },
        },
        { upsert: true, returnDocument: "after" }
      );
      applied.push(id);
    }
  }

  const since =
    typeof body.since === "string" && !Number.isNaN(Date.parse(body.since))
      ? body.since
      : "0001-01-01T00:00:00.000Z";

  const pulled = await SyncRecordModel.find({
    ownerId,
    updatedAt: { $gt: since },
  })
    .sort({ updatedAt: 1 })
    .limit(MAX_PULL_RECORDS)
    .lean<{ data: Record<string, unknown>; updatedAt: string; version?: number }[]>();

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[Sync] Finished for owner ${ownerId.slice(0, 8)}…: ${applied.length} applied, ${rejected.length} rejected, ${pulled.length} pulled.`
    );
  }

  return NextResponse.json(
    {
      success: true,
      configured: true,
      applied,
      rejected,
      records: pulled.map((row) => ({
        ...row.data,
        version: row.version ?? (row.data as any)?.version ?? 1,
      })),
      serverTime: serverNowIso,
    },
    { headers: rateHeaders }
  );
}
