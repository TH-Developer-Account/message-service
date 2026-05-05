/**
 * helper/utils/machine-token-cache.js
 *
 * Redis-backed token cache for the Machine API.
 * Mirrors token-cache.js used for the Mobility API — same strategy, separate
 * Redis key so the two tokens never collide.
 *
 * Strategy:
 *  - getToken()          → return cached token if present, else login and cache it
 *  - forceRefreshToken() → delete the cached key, login, and re-cache
 *  - TTL defaults to 1200 s (20 min) so the cache expires slightly before the
 *    real token does, avoiding edge-case 401 s.
 */

import { redis } from "../../config/redis.js";
import { loginAndGetMachineToken } from "../../services/edost-create-service-ticket.handler.js";
import logger from "./logger.js";

const REDIS_KEY = "machine:access_token";
const TOKEN_TTL_SECONDS = parseInt("1200", 10);

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Returns a valid Machine API token.
 * Hits Redis first; only calls the login API on a cache miss.
 *
 * @returns {Promise<string>}
 */
export async function getToken() {
  const cached = await redis.get(REDIS_KEY);

  if (cached) {
    logger.debug("Machine token served from cache");
    return cached;
  }

  logger.info("Machine token cache miss — logging in");
  return _loginAndCache();
}

/**
 * Forces a new login regardless of cache state.
 * Call this after a confirmed 401/403 so the stale token is evicted.
 *
 * @returns {Promise<string>}
 */
export async function forceRefreshToken() {
  await redis.del(REDIS_KEY);
  logger.warn("Machine token evicted from cache — refreshing");
  return _loginAndCache();
}

// ─── Internal ─────────────────────────────────────────────────────────────

async function _loginAndCache() {
  const token = await loginAndGetMachineToken();

  if (!token) {
    throw new Error("Machine API login succeeded but returned no token");
  }

  // NX — only set if the key doesn't already exist (avoids a race where two
  // simultaneous cache misses both try to write).
  await redis.set(REDIS_KEY, token, "NX", "EX", TOKEN_TTL_SECONDS);
  logger.info("Machine token cached", { ttl: TOKEN_TTL_SECONDS });
  return token;
}
