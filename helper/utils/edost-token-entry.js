/**
 * helper/utils/machine-token-retry.js
 *
 * Wraps any async Machine API call with automatic token-refresh logic.
 * Mirrors token-retry.js — the only difference is it pulls tokens from
 * machine-token-cache.js (Redis) instead of process.env.
 *
 * Flow:
 *  1. getToken()    → Redis hit → no login call needed
 *  2. Call fn(token)
 *  3. On 401/403    → forceRefreshToken() evicts the stale key and re-logs in
 *  4. Retry once with the fresh token — any second failure propagates to caller
 *
 * Usage:
 *   const machines = await withMachineTokenRetry((token) =>
 *     fetchMachineDetails(phoneNumber, token),
 *   );
 */

import { getToken, forceRefreshToken } from "./edost-token-cache.js";
import logger from "./logger.js";

/**
 * @template T
 * @param {(token: string) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withMachineTokenRetry(fn) {
  const token = await getToken(); // served from Redis when valid

  try {
    return await fn(token);
  } catch (err) {
    const status = err.response?.status;

    if (status === 401 || status === 403) {
      logger.warn("Machine token rejected by API — forcing refresh", {
        status,
      });

      const freshToken = await forceRefreshToken(); // evict + re-login
      return await fn(freshToken); // second failure propagates
    }

    throw err;
  }
}
