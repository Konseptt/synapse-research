import Redis from "ioredis";

const buckets = new Map<string, { count: number; resetAt: number }>();

const globalForRedis = globalThis as unknown as {
  __synapseRateRedis?: Redis;
  __synapseRateRedisDown?: boolean;
};

function redisClient(): Redis | null {
  if (globalForRedis.__synapseRateRedisDown) return null;
  if (globalForRedis.__synapseRateRedis) return globalForRedis.__synapseRateRedis;

  const url = process.env.REDIS_URL;
  if (!url) {
    globalForRedis.__synapseRateRedisDown = true;
    return null;
  }

  try {
    const client = new Redis(url, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 800,
      commandTimeout: 800,
      retryStrategy: () => null,
    });
    client.on("error", () => {
      globalForRedis.__synapseRateRedisDown = true;
    });
    globalForRedis.__synapseRateRedis = client;
    return client;
  } catch {
    globalForRedis.__synapseRateRedisDown = true;
    return null;
  }
}

/** In-process fallback (per lambda). Prefer `rateLimitAsync` in API routes. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs = 60_000,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count };
}

/** Shared Redis counter when available — works across serverless instances. */
export async function rateLimitAsync(
  key: string,
  limit: number,
  windowMs = 60_000,
): Promise<{ allowed: boolean; remaining: number }> {
  const client = redisClient();
  if (client) {
    try {
      const redisKey = `synapse:ratelimit:${key}`;
      const count = await client.incr(redisKey);
      if (count === 1) await client.pexpire(redisKey, windowMs);
      if (count > limit) return { allowed: false, remaining: 0 };
      return { allowed: true, remaining: Math.max(0, limit - count) };
    } catch {
      // fall through to in-process
    }
  }
  return rateLimit(key, limit, windowMs);
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
