import type { AnyRecord } from "./types";

export interface CloudStatsResponse {
  success: boolean;
  configured: boolean;
  database: string;
  collection: string;
  cloudRecordsCount: number;
  serverTime: string;
  error?: string;
}

export async function fetchCloudStats(
  token: string,
  signal?: AbortSignal
): Promise<CloudStatsResponse> {
  const response = await fetch("/api/sync", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  });

  if (!response.ok) {
    let message = "Could not reach cloud database.";
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // Default
    }
    throw new Error(message);
  }

  return (await response.json()) as CloudStatsResponse;
}

export interface SyncResponse {
  success: boolean;
  configured: boolean;
  applied?: string[];
  rejected?: { id?: string; reason: string }[];
  records?: AnyRecord[];
  serverTime?: string;
  error?: string;
}

export async function syncWithCloud(input: {
  token: string;
  since: string | null;
  changes: AnyRecord[];
  signal?: AbortSignal;
}): Promise<SyncResponse> {
  const response = await fetch("/api/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.token}`,
    },
    body: JSON.stringify({
      since: input.since,
      changes: input.changes.map((record) => ({
        id: record.id,
        entity: record.entity,
        updatedAt: record.updatedAt,
        baseVersion: record.version ?? record.baseVersion,
        data: record,
      })),
    }),
    signal: input.signal,
  });

  if (!response.ok) {
    let message = "Could not reach cloud sync.";
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // Keep the friendly default.
    }
    throw new Error(message);
  }

  return (await response.json()) as SyncResponse;
}
