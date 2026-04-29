/**
 * helper/utils/token-retry.js
 *
 * Wraps any async Mobility API call with automatic token refresh logic.
 * On a 401/403 response it fetches a fresh token and retries once.
 * Any second failure propagates to the caller.
 *
 * Usage:
 *   const data = await withTokenRetry((token) => fetchSomething(id, token));
 */
import { loginAndGetToken } from "../mobility.helper.js";
import logger from "./logger.js";

export async function withTokenRetry(fn) {
  let token = process.env.MOBILITY_ACCESS_TOKEN;

  try {
    return await fn(token);
  } catch (err) {
    const status = err.response?.status;

    if (status === 401 || status === 403) {
      logger.warn("Mobility token expired — refreshing and retrying", {
        status,
      });
      token = await loginAndGetToken();
      return await fn(token); // second failure propagates to caller
    }

    throw err;
  }
}
