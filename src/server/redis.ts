import Redis from "ioredis";

// Singleton across HMR reloads in dev. Lazy: only connects on first command.
const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6380", {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false, // fail fast; callers degrade gracefully
  });

// Avoid unhandled error events crashing the process when Redis is down.
redis.on("error", (err) => {
  if (process.env.NODE_ENV === "development") {
    console.warn("[redis]", err.message);
  }
});

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
