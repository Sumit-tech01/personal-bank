import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  connectToDatabase,
  getLastMongoDiagnostic,
  getMongoUri,
} from "@/lib/mongodb";
import { SyncRecordModel } from "@/models";

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

interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 120;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  entry.count += 1;
  return true;
}

function ownerFromToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 40);
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

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!isValidToken(token)) {
    return NextResponse.json(
      { success: false, error: "A valid private sync key is required." },
      { status: 401 }
    );
  }

  const rateKey = `get_${token.slice(0, 16)}`;
  if (!checkRateLimit(rateKey)) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  if (!getMongoUri()) {
    return NextResponse.json({
      success: true,
      configured: false,
      database: "local",
      collection: "none",
      cloudRecordsCount: 0,
      serverTime: new Date().toISOString(),
    });
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
      { status: 503 }
    );
  }

  const ownerId = ownerFromToken(token);
  const cloudRecordsCount = await SyncRecordModel.countDocuments({ ownerId });
  const database = connection.connection.name || "personal_bank";
  const collection = SyncRecordModel.collection.name || "syncrecords";

  return NextResponse.json({
    success: true,
    configured: true,
    database,
    collection,
    cloudRecordsCount,
    serverTime: new Date().toISOString(),
  });
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

  const rateKey = `post_${token.slice(0, 16)}`;
  if (!checkRateLimit(rateKey)) {
    return NextResponse.json(
      { success: false, error: "Too many sync requests. Please wait a moment." },
      { status: 429 }
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
      { status: 400 }
    );
  }

  const changes = Array.isArray(body.changes) ? body.changes : [];
  if (changes.length > MAX_CHANGES_PER_REQUEST) {
    return NextResponse.json(
      { success: false, error: "Too many changes in one sync request." },
      { status: 413 }
    );
  }

  if (!getMongoUri()) {
    return NextResponse.json({
      success: true,
      configured: false,
      records: [],
      serverTime: new Date().toISOString(),
    });
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
      { status: 503 }
    );
  }

  const ownerId = ownerFromToken(token);
  const applied: string[] = [];
  const rejected: { id?: string; reason: string }[] = [];

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

    const data = { ...(change.data as Record<string, unknown>) };
    data.id = id;
    data.entity = entity;
    data.ownerId = ownerId;
    delete data.dirty;

    const serialized = JSON.stringify(data);
    if (serialized.length > MAX_RECORD_BYTES) {
      rejected.push({ id, reason: "Record is too large." });
      continue;
    }

    const existing = await SyncRecordModel.findOne({ ownerId, recordId: id })
      .select({ updatedAt: 1 })
      .lean<{ updatedAt: string } | null>();

    if (existing && existing.updatedAt > change.updatedAt) {
      rejected.push({ id, reason: "A newer version already exists." });
      continue;
    }

    await SyncRecordModel.findOneAndUpdate(
      { ownerId, recordId: id },
      {
        $set: {
          entity,
          updatedAt: change.updatedAt,
          data,
          lastSeenAt: new Date(),
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    applied.push(id);
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
    .lean<{ data: Record<string, unknown>; updatedAt: string }[]>();

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[Sync] Finished for owner ${ownerId.slice(0, 8)}…: ${applied.length} applied, ${rejected.length} rejected, ${pulled.length} pulled.`
    );
  }

  return NextResponse.json({
    success: true,
    configured: true,
    applied,
    rejected,
    records: pulled.map((row) => row.data),
    serverTime: new Date().toISOString(),
  });
}
