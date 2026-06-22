/**
 * In-process TTL cache — zero-latency hits on repeat queries within a warm instance.
 * Keys are hashed strings; values are JSON-serializable.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

const MAX_ENTRIES = 500;

export function cacheKey(parts: string[]): string {
  return parts.join("::");
}

export function turboGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function turboSet<T>(key: string, value: T, ttlMs: number): void {
  if (store.size >= MAX_ENTRIES) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export const TTL = {
  pubmed: 15 * 60 * 1000,
  overview: 24 * 60 * 60 * 1000,
  chat: 60 * 60 * 1000,
  embedding: 30 * 60 * 1000,
} as const;
