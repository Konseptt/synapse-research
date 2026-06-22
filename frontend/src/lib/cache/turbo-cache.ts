/**
 * Layered TTL cache.
 *
 *   L1 — in-process Map (zero-latency, but per-instance; on serverless it is
 *        cold on every new lambda).
 *   L2 — Redis (shared across every instance, survives cold starts). This is
 *        what makes repeat / popular searches feel instant in production.
 *
 * L2 degrades gracefully: if Redis is missing or unreachable a circuit breaker
 * trips on the first failure and the cache silently falls back to L1 only, so
 * the request path never blocks waiting on a dead Redis.
 *
 * The synchronous `turboGet` / `turboSet` API is kept for hot in-loop callers
 * (embeddings, etc). New code on the request path should prefer the async
 * `turboGetAsync` / `turboSetAsync` so it can benefit from the shared L2.
 */

import Redis from "ioredis";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

const MAX_ENTRIES = 1000;
const REDIS_PREFIX = "synapse:cache:";
/** How long an L2 hit is mirrored into L1 before we re-check Redis. */
const L1_MIRROR_MS = 60_000;

export function cacheKey(parts: string[]): string {
  return parts.join("::");
}

/* ------------------------------------------------------------------ L1 ---- */

export function turboGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  // Refresh LRU recency so hot keys survive eviction.
  store.delete(key);
  store.set(key, entry);
  return entry.value as T;
}

export function turboSet<T>(key: string, value: T, ttlMs: number): void {
  if (store.size >= MAX_ENTRIES && !store.has(key)) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/* ------------------------------------------------------------------ L2 ---- */

const globalForRedis = globalThis as unknown as {
  __synapseRedis?: Redis;
  __synapseRedisDown?: boolean;
};

function redisClient(): Redis | null {
  if (globalForRedis.__synapseRedisDown) return null;
  if (globalForRedis.__synapseRedis) return globalForRedis.__synapseRedis;

  const url = process.env.REDIS_URL;
  if (!url) {
    globalForRedis.__synapseRedisDown = true;
    return null;
  }

  try {
    const client = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 800,
      commandTimeout: 800,
      // Do not hammer a dead host — one failure trips the breaker below.
      retryStrategy: () => null,
    });
    // A connection/command error disables Redis for the lifetime of this
    // instance; we never want cache plumbing to slow down a request.
    client.on("error", () => {
      globalForRedis.__synapseRedisDown = true;
    });
    globalForRedis.__synapseRedis = client;
    return client;
  } catch {
    globalForRedis.__synapseRedisDown = true;
    return null;
  }
}

/** L1 → L2 read. Mirrors an L2 hit back into L1 for subsequent instant reads. */
export async function turboGetAsync<T>(key: string): Promise<T | null> {
  const local = turboGet<T>(key);
  if (local !== null) return local;

  const client = redisClient();
  if (!client) return null;

  try {
    const raw = await client.get(REDIS_PREFIX + key);
    if (!raw) return null;
    const value = JSON.parse(raw) as T;
    turboSet(key, value, L1_MIRROR_MS);
    return value;
  } catch {
    return null;
  }
}

/** Write-through to L1 and (best-effort) L2. */
export async function turboSetAsync<T>(key: string, value: T, ttlMs: number): Promise<void> {
  turboSet(key, value, ttlMs);

  const client = redisClient();
  if (!client) return;

  try {
    await client.set(REDIS_PREFIX + key, JSON.stringify(value), "PX", ttlMs);
  } catch {
    // L1 already holds it — Redis is optional.
  }
}

export const TTL = {
  pubmed: 15 * 60 * 1000,
  overview: 24 * 60 * 60 * 1000,
  chat: 60 * 60 * 1000,
  embedding: 30 * 60 * 1000,
  search: 15 * 60 * 1000,
} as const;
