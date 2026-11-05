/**
 * PERSONAL BANK — DISTRIBUTED SERVERLESS RATE LIMITER
 *
 * Implements persistent, distributed rate-limiting for Next.js serverless execution:
 * 1. Primary: Upstash Redis REST API (atomic pipeline operations via native fetch).
 * 2. Fallback: Process-local sliding window memory store (for local dev, tests, and resilience).
 * 3. Fail-open tolerance: Upstash timeouts (1500ms) or network failures safely fall back to local
 *    rate limiting with structured warnings so farmers are never locked out during Redis outages.
 * 4. Zero client secrets: Environment variables UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 *    remain strictly server-side.
 */

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in milliseconds
  provider: "upstash" | "memory";
  error?: string;
}

interface MemoryEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();

// Clean up stale memory store entries periodically
function cleanStaleMemoryStore() {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.resetAt) {
      memoryStore.delete(key);
    }
  }
}

export function checkMemoryRateLimit(
  key: string,
  limit = 120,
  windowMs = 60_000
): RateLimitResult {
  const now = Date.now();
  if (memoryStore.size > 10_000) {
    cleanStaleMemoryStore();
  }

  const entry = memoryStore.get(key);
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: resetAt,
      provider: "memory",
    };
  }

  if (entry.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: entry.resetAt,
      provider: "memory",
    };
  }

  entry.count += 1;
  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - entry.count),
    reset: entry.resetAt,
    provider: "memory",
  };
}

export function isUpstashConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return Boolean(
    url &&
      token &&
      !url.includes("<") &&
      !url.includes(">") &&
      !token.includes("<") &&
      !token.includes(">")
  );
}

/**
 * Executes distributed rate limiting against Upstash Redis REST API via atomic pipeline.
 * Key is prefixed with "pb_ratelimit:" to ensure namespace isolation.
 */
export async function checkDistributedRateLimit(
  key: string,
  limit = 120,
  windowSeconds = 60
): Promise<RateLimitResult> {
  const windowMs = windowSeconds * 1000;

  if (!isUpstashConfigured()) {
    if (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production") {
      console.warn(
        "[RateLimit Warning] UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not configured in Vercel production. Operating on serverless process memory fallback."
      );
    }
    return checkMemoryRateLimit(key, limit, windowMs);
  }

  const rawUrl = process.env.UPSTASH_REDIS_REST_URL!.trim().replace(/\/+$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!.trim();
  const redisKey = `pb_ratelimit:${key}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    // Primary: Atomic Lua script executed in single-threaded Redis core
    // Guarantees INCR and EXPIRE are executed atomically without command interleaving
    const luaScript =
      "local c = redis.call('INCR', KEYS[1]); if c == 1 or redis.call('TTL', KEYS[1]) < 0 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return c;";

    const response = await fetch(rawUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["EVAL", luaScript, 1, redisKey, windowSeconds]),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let currentCount: number | null = null;

    if (response.ok) {
      const data = (await response.json()) as { result?: unknown; error?: string };
      if (typeof data?.result === "number") {
        currentCount = data.result;
      }
    }

    // Fallback: If EVAL is disabled or returned non-200, attempt pipeline [INCR, EXPIRE]
    if (currentCount === null) {
      const pipelineUrl = `${rawUrl}/pipeline`;
      const pipeRes = await fetch(pipelineUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", redisKey],
          ["EXPIRE", redisKey, windowSeconds, "NX"],
        ]),
      });

      if (pipeRes.ok) {
        const pipeData = (await pipeRes.json()) as Array<{ result?: unknown }>;
        if (Array.isArray(pipeData) && typeof pipeData[0]?.result === "number") {
          currentCount = pipeData[0].result;
        }
      }
    }

    if (currentCount === null) {
      console.warn(
        `[RateLimit Warning] Upstash command failed. Falling back to memory.`
      );
      return checkMemoryRateLimit(key, limit, windowMs);
    }
    const now = Date.now();
    const reset = now + windowMs;
    const success = currentCount <= limit;
    const remaining = Math.max(0, limit - currentCount);

    return {
      success,
      limit,
      remaining,
      reset,
      provider: "upstash",
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isAbort = (err as Error)?.name === "AbortError";
    console.warn(
      `[RateLimit Warning] Upstash call failed (${isAbort ? "timeout" : "network"}). Using resilient fallback.`
    );
    return checkMemoryRateLimit(key, limit, windowMs);
  }
}
