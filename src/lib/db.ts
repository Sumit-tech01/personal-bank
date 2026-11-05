import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Account, AnyRecord, EntityName, Preferences, SyncMeta } from "./types";

interface ShetiKhataDB extends DBSchema {
  records: {
    key: string;
    value: AnyRecord;
    indexes: {
      "by-owner": string;
      "by-entity": string;
      "by-owner-entity": [string, string];
      "by-updated": string;
    };
  };
  meta: {
    key: string;
    value: { key: string; value: unknown };
  };
}

const DB_NAME = "ShetiKhataApp";
const DB_VERSION = 1;
const ACCOUNT_KEY = "account";
const PREFERENCES_KEY = "preferences";

let dbPromise: Promise<IDBPDatabase<ShetiKhataDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<ShetiKhataDB>> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Local storage is only available in the browser."));
  }

  if (!dbPromise) {
    dbPromise = openDB<ShetiKhataDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("records")) {
          const store = db.createObjectStore("records", { keyPath: "id" });
          store.createIndex("by-owner", "ownerId");
          store.createIndex("by-entity", "entity");
          store.createIndex("by-owner-entity", ["ownerId", "entity"]);
          store.createIndex("by-updated", "updatedAt");
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      },
      blocked() {
        console.warn("Sheti Khata database is blocked by another tab.");
      },
      blocking() {
        console.warn("A newer version of Sheti Khata is open in another tab.");
      },
    });
  }

  return dbPromise;
}

async function readMeta<T>(key: string): Promise<T | null> {
  const db = await getDB();
  const row = await db.get("meta", key);
  return (row?.value as T) ?? null;
}

async function writeMeta(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put("meta", { key, value });
}

export async function getStoredAccount(): Promise<Account | null> {
  return readMeta<Account>(ACCOUNT_KEY);
}

export async function storeAccount(account: Account): Promise<void> {
  await writeMeta(ACCOUNT_KEY, account);
}

export async function getPreferences(): Promise<Preferences> {
  const stored = await readMeta<Preferences>(PREFERENCES_KEY);
  return {
    language: stored?.language ?? "en",
    notificationsEnabled: stored?.notificationsEnabled ?? false,
    lastUsedCategory: stored?.lastUsedCategory ?? {},
    lastBackupAt: stored?.lastBackupAt,
  };
}

export async function storePreferences(preferences: Preferences): Promise<void> {
  await writeMeta(PREFERENCES_KEY, preferences);
}

export async function getSyncMeta(ownerId: string): Promise<SyncMeta> {
  const stored = await readMeta<SyncMeta>(`sync:${ownerId}`);
  return {
    lastSyncAt: stored?.lastSyncAt ?? null,
    cloudConfigured: stored?.cloudConfigured ?? true,
    lastSyncError: stored?.lastSyncError,
  };
}

export async function storeSyncMeta(ownerId: string, meta: SyncMeta): Promise<void> {
  await writeMeta(`sync:${ownerId}`, meta);
}

export async function getAllRecords(ownerId: string): Promise<AnyRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex("records", "by-owner", ownerId);
}

export async function getRecordsByEntity(
  ownerId: string,
  entity: EntityName
): Promise<AnyRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex("records", "by-owner-entity", [ownerId, entity]);
}

export async function getRecord<T extends AnyRecord>(id: string): Promise<T | null> {
  const db = await getDB();
  const record = await db.get("records", id);
  return (record as T) ?? null;
}

export async function putRecord(record: AnyRecord): Promise<void> {
  const db = await getDB();
  await db.put("records", record);
}

export async function putRecords(records: AnyRecord[]): Promise<void> {
  if (!records.length) return;
  const db = await getDB();
  const tx = db.transaction("records", "readwrite");
  await Promise.all(records.map((record) => tx.store.put(record)));
  await tx.done;
}

export async function getDirtyRecords(ownerId: string): Promise<AnyRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("records", "by-owner", ownerId);
  return all.filter((record) => record.dirty === true || record.dirty === undefined);
}

export async function markAllOwnerRecordsDirty(ownerId: string): Promise<number> {
  const db = await getDB();
  const all = await db.getAllFromIndex("records", "by-owner", ownerId);
  if (!all.length) return 0;
  const tx = db.transaction("records", "readwrite");
  const now = new Date().toISOString();
  await Promise.all(
    all.map((record) =>
      tx.store.put({
        ...record,
        dirty: true,
        updatedAt: record.updatedAt || now,
      })
    )
  );
  await tx.done;
  return all.length;
}

export async function markRecordsSynced(
  records: { id: string; updatedAt: string }[]
): Promise<void> {
  if (!records.length) return;
  const db = await getDB();
  const tx = db.transaction("records", "readwrite");
  await Promise.all(
    records.map(async ({ id, updatedAt }) => {
      const existing = await tx.store.get(id);
      if (existing && existing.updatedAt === updatedAt) {
        await tx.store.put({ ...existing, dirty: false });
      }
    })
  );
  await tx.done;
}

export async function deleteOwnerData(ownerId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("records", "readwrite");
  let cursor = await tx.store.index("by-owner").openCursor(ownerId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
  await db.delete("meta", `sync:${ownerId}`);
}

export async function clearAccount(): Promise<void> {
  const db = await getDB();
  await db.delete("meta", ACCOUNT_KEY);
}

export async function clearEverything(): Promise<void> {
  const db = await getDB();
  await db.clear("records");
  await db.clear("meta");
}

export async function getDatabaseStats(ownerId: string): Promise<{
  total: number;
  byEntity: Record<string, number>;
}> {
  const records = await getAllRecords(ownerId);
  const byEntity: Record<string, number> = {};
  for (const record of records) {
    if (record.deletedAt) continue;
    byEntity[record.entity] = (byEntity[record.entity] ?? 0) + 1;
  }
  return { total: records.filter((record) => !record.deletedAt).length, byEntity };
}

export interface StoragePersistenceDiagnostic {
  supported: boolean;
  persisted: boolean;
  quotaBytes?: number;
  usageBytes?: number;
}

/**
 * Safe, best-effort request for persistent IndexedDB storage (navigator.storage.persist).
 * Prevents Android OS from evicting local financial records under device storage pressure.
 * Operates non-blockingly and returns diagnostic metrics.
 */
export async function requestStoragePersistence(): Promise<StoragePersistenceDiagnostic> {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    !navigator.storage
  ) {
    return { supported: false, persisted: false };
  }

  try {
    let persisted = false;
    if (typeof navigator.storage.persisted === "function") {
      persisted = await navigator.storage.persisted();
    }
    if (!persisted && typeof navigator.storage.persist === "function") {
      persisted = await navigator.storage.persist();
    }

    let quotaBytes: number | undefined;
    let usageBytes: number | undefined;
    if (typeof navigator.storage.estimate === "function") {
      const estimate = await navigator.storage.estimate();
      quotaBytes = estimate.quota;
      usageBytes = estimate.usage;
    }

    return {
      supported: true,
      persisted,
      quotaBytes,
      usageBytes,
    };
  } catch (err) {
    console.warn("Storage persistence request failed", err);
    return { supported: true, persisted: false };
  }
}

