/**
 * helper/utils/ticket-contact-store.js
 *
 * Maps a service ticket's reference number to the WhatsApp number that
 * created it, so a later status update from the external party — which
 * only knows the reference number — can be routed back to the right
 * customer.
 *
 * There is no database in this system. Redis is the only persistence
 * layer available, so this mapping lives and dies by Redis's RDB
 * snapshot schedule and the TTL below. Same shape as edost-token-cache.js.
 */

import { redis } from "../../config/redis.js";
import logger from "./logger.js";

const REDIS_KEY_PREFIX = "ticket:contact:";

// External party is expected to call back with the reference number
// within 7 days of ticket creation — chosen TTL matches that window.
const TTL_SECONDS = 7 * 24 * 60 * 60;

function redisKeyFor(referenceNumber) {
  return `${REDIS_KEY_PREFIX}${referenceNumber}`;
}

/**
 * @param {string} referenceNumber  Ticket ID returned by createServiceTicket
 * @param {string} phoneNumber      WhatsApp number that created the ticket
 */
export async function saveTicketContact(referenceNumber, phoneNumber) {
  await redis.set(redisKeyFor(referenceNumber), phoneNumber, "EX", TTL_SECONDS);
  logger.debug("Ticket contact mapping saved", {
    referenceNumber,
    ttlSeconds: TTL_SECONDS,
  });
}

/**
 * @param {string} referenceNumber
 * @returns {Promise<string|null>}  The WhatsApp number, or null if the
 *                                  mapping expired or never existed.
 */
export async function getTicketContact(referenceNumber) {
  const phoneNumber = await redis.get(redisKeyFor(referenceNumber));

  if (!phoneNumber) {
    logger.warn("Ticket contact mapping not found", { referenceNumber });
  }

  return phoneNumber;
}
