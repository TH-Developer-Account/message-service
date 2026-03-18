import { redis } from "../config/redis.js";

const TTL_SECONDS = 60 * 60; // 1 hour

export async function isDuplicateMessage(messageId) {
  if (!messageId) return false;

  // SETNX pattern (atomic)
  const result = await redis.set(
    `wa:msg:${messageId}`,
    "1",
    "NX",
    "EX",
    TTL_SECONDS,
  );

  return result === null; // null means already exists → duplicate
}
