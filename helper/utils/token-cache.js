/**
 * helper/utils/token-cache.js
 *
 * Redis-backed token cache for the Mobility API.
 *
 * Strategy:
 *  - On getToken()  → return cached token if present, else login and cache it
 *  - On forceRefresh() → delete the cached key, login, and re-cache
 *  - TTL is set to TOKEN_TTL_SECONDS (default 300s = 5 min) so the cache
 *    always expires ~1 min before the real token does, avoiding edge-case 401s
 *
 * The redis client is created once and reused across the process lifetime.
 */
import { redis } from "../../config/redis.js";
import { loginAndGetToken } from "../mobility.helper.js";
import logger from "./logger.js";

// ─── Config ───────────────────────────────────────────────────────────────
const REDIS_KEY = "mobility:access_token";
const TOKEN_TTL_SECONDS = parseInt("300", 10); // 5 min default

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Returns a valid Mobility token.
 * Hits Redis first; only calls the login API on a cache miss.
 */
export async function getToken() {
  const cached = await redis.get(REDIS_KEY);

  if (cached) {
    logger.debug("Mobility token served from cache");
    return cached;
  }

  logger.info("Mobility token cache miss — logging in");
  return _loginAndCache(redis);
}

/**
 * Forces a new login regardless of cache state.
 * Call this after a confirmed 401/403 so the stale token is evicted.
 */
export async function forceRefreshToken() {
  await redis.del(REDIS_KEY);
  logger.warn("Mobility token evicted from cache — refreshing");
  return _loginAndCache(redis);
}

// ─── Internal helpers ─────────────────────────────────────────────────────

async function _loginAndCache(redis) {
  const token = await loginAndGetToken();

  if (!token) {
    throw new Error("Login succeeded but returned no token");
  }

  await redis.set(REDIS_KEY, token, { NX: true, EX: TOKEN_TTL_SECONDS });
  logger.info("Mobility token cached", { ttl: TOKEN_TTL_SECONDS });
  return token;
}
