import type { NextRequest } from "next/server";
import { redis } from "@/server/redis";
import { ApiError } from "@/lib/api";

/**
 * Sliding-window rate limiter on Redis sorted sets.
 * Fails OPEN when Redis is unreachable (availability over strictness for dev;
 * flip failOpen=false on sensitive routes in production).
 */
export async function rateLimit(
  req: NextRequest,
  opts: { key: string; limit: number; windowSeconds: number; failOpen?: boolean },
): Promise<void> {
  const { key, limit, windowSeconds, failOpen = true } = opts;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "local";
  const bucket = `rl:${key}:${ip}`;
  const now = Date.now();

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(bucket, 0, now - windowSeconds * 1000);
    pipeline.zadd(bucket, now, `${now}:${Math.random()}`);
    pipeline.zcard(bucket);
    pipeline.expire(bucket, windowSeconds);
    const results = await pipeline.exec();
    const count = (results?.[2]?.[1] as number) ?? 0;

    if (count > limit) {
      throw new ApiError(429, "RATE_LIMITED", "Too many requests, slow down");
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (!failOpen) {
      throw new ApiError(503, "SERVICE_UNAVAILABLE", "Rate limiter unavailable");
    }
    // Redis down in dev → allow the request.
  }
}
