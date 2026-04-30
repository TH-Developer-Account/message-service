/**
 * helper/utils/token-retry.js
 *
 * Wraps any async Mobility API call with automatic token refresh logic.
 *
 * Flow:
 *  1. Fetch token from Redis cache (getToken)          → no login API call
 *  2. Call the wrapped function with that token
 *  3. If 401/403 → evict stale token, force a fresh login (forceRefreshToken)
 *  4. Retry once with the new token — any second failure propagates to caller
 *
 * Usage:
 *   const data = await withTokenRetry((token) => fetchSomething(id, token));
 */
import { getToken, forceRefreshToken } from "./mobility-token-cache.js";
import logger from "./logger.js";

export async function withTokenRetry(fn) {
  const token = await getToken(); // served from Redis when valid

  try {
    return await fn(token);
  } catch (err) {
    const status = err.response?.status;

    if (status === 401 || status === 403) {
      logger.warn("Mobility token rejected by API — forcing refresh", {
        status,
      });

      const freshToken = await forceRefreshToken(); // evict + re-login
      return await fn(freshToken); // second failure propagates to caller
    }

    throw err;
  }
}
