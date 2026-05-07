import { redis } from "../config/redis.js";
import logger from "../helper/utils/logger.js";

const TTL_SECONDS = 5 * 60; // 5 minutes

export async function isDuplicateMessage(messageId) {
  if (!messageId) return false;

  try {
    const result = await redis.set(
      `wa:msg:${messageId}`,
      "1",
      "NX",
      "EX",
      TTL_SECONDS,
    );
    return result === null;
  } catch (err) {
    // Log but don't block — prefer processing over dropping
    logger.error("Redis dedup check failed, allowing message through", {
      messageId,
      err: err.message,
    });
    return false;
  }
}
