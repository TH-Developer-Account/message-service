import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

// Used by application code (dedup, token caching)
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
});

redis.on("error", (err) => {
  // Prevents unhandled 'error' event from crashing the process on connection loss
  const msg = err.message ?? String(err);
  if (!msg.includes("ECONNREFUSED") && !msg.includes("ENOTFOUND")) {
    console.error("[redis] unexpected error:", msg);
  }
});

// Used by BullMQ Queue and Worker — they manage their own ioredis connections
export const bullmqConnection = { url: REDIS_URL };
