/**
 * helper/machine.helper.js
 *
 * All raw HTTP calls to the Tata Hitachi API.
 *
 *  loginAndGetMachineToken  → POST /authorizationserver/oauth/token
 *                             OAuth2 client_credentials → bearer token
 *
 *  fetchCustomerId          → GET /occ/v2/.../users/{phoneNo}
 *                             Resolves a WhatsApp phone number to a customerId
 *
 *  fetchMachineDetails      → calls fetchCustomerId first, then
 *                             GET /occ/v2/.../users/{customerId}/dealers/equipments
 *                             Returns the equipment list for that customer
 *
 * No retry logic lives here — that is handled by machine-token-retry.js.
 */

import axios from "axios";
import logger from "../utils/logger.js";
import FormData from "form-data";
import { withMachineTokenRetry } from "../utils/edost-token-entry.js";
import { WhatsAppAPI } from "../../services/whatsapp-api.js";

const BASE_URL =
  "https://api.cegcpapa5m-tatahitac1-s1-public.model-t.cc.commerce.ondemand.com";

const AUTH_URL = `${BASE_URL}/authorizationserver/oauth/token`;

// Headers shared by every authenticated GET to this API
const commonHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/json, text/plain, */*",
  Referer:
    "https://jsapps.cegcpapa5m-tatahitac1-s1-public.model-t.cc.commerce.ondemand.com/",
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Mobile Safari/537.36 Edg/147.0.0.0",
  "sec-ch-ua-platform": '"Android"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua":
    '"Microsoft Edge";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
  "X-Anonymous-Consents": "%5B%5D",
});

// ─── Auth ─────────────────────────────────────────────────────────────────

/**
 * OAuth2 client_credentials login.
 * Returns a fresh access_token string; caching is handled by machine-token-cache.js.
 *
 * @returns {Promise<string>}
 */
export async function loginAndGetMachineToken() {
  logger.info("Fetching fresh Machine API token");

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "",
    client_id: "whatsapp_chatbot_thcm",
    client_secret: "Secret",
  });

  const response = await axios.post(AUTH_URL, body, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json, text/plain, */*",
      Referer: "https://www.edost.tatahitachi.co.in/",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
    },
  });

  const token = response.data.access_token;
  if (!token) {
    throw new Error("Machine API login succeeded but returned no token");
  }

  logger.info("Machine API login successful");
  return token;
}

// ─── Step 1: phone number → customerId ────────────────────────────────────

/**
 * GET /occ/v2/tatahitachi-spa/users/{phoneNo}?lang=en&curr=INR
 *
 * @param {string} phoneNumber  WhatsApp number, e.g. "+918792426168"
 * @param {string} token        Valid bearer token
 * @returns {Promise<string>}   The customerId (uid) for this phone number
 */
async function fetchCustomerId(phoneNumber, token) {
  logger.debug("Fetching customerId for phone number", { phoneNumber });

  try {
    const response = await axios.get(
      `${BASE_URL}/occ/v2/tatahitachi-spa/users/${encodeURIComponent(phoneNumber)}`,
      {
        headers: commonHeaders(token),
        params: { lang: "en", curr: "INR" },
      },
    );

    const customerId = response.data.customerId;

    if (!customerId) {
      throw new Error(`No customerId found for phone number: ${phoneNumber}`);
    }

    logger.debug("customerId resolved", { phoneNumber, customerId });
    return customerId;
  } catch (err) {
    // Log the actual API error body so we can see what it's rejecting
    logger.error("fetchCustomerId failed", {
      status: err.response?.status,
      data: err.response?.data, // ← this will tell us exactly what's wrong
      phoneNumber,
    });
    throw err;
  }
}

// ─── Step 2: customerId → equipment list ──────────────────────────────────

/**
 * Fetches the list of machines/equipment for a given phone number.
 * Internally calls fetchCustomerId first, then the equipments endpoint.
 *
 * GET /occ/v2/tatahitachi-spa/users/{customerId}/dealers/equipments?lang=en&curr=INR
 *
 * @param {string} phoneNumber  WhatsApp number, e.g. "+918792426168"
 * @param {string} token        Valid bearer token
 * @returns {Promise<Array<{ serialNumber: string, machineName: string }>>}
 */
export async function fetchMachineDetails(phoneNumber, token) {
  // Step 1 — resolve phone → customerId
  const customerId = await fetchCustomerId(phoneNumber, token);

  // Step 2 — fetch equipments using customerId
  logger.debug("Fetching equipments", { customerId });

  const response = await axios.get(
    `${BASE_URL}/occ/v2/tatahitachi-spa/users/${customerId}/dealers/equipments`,
    {
      headers: {
        ...commonHeaders(token),
        "Content-Type": "application/json",
      },
      params: { lang: "en", curr: "INR" },
    },
  );

  // Adjust to match the actual response envelope from the API
  return response?.data?.equipments || [];
}

// ─── Submit service ticket ─────────────────────────────────────────────────

/**
 * POST /occ/v2/tatahitachi-spa/users/{customerId}/support-ticket/
 * Sends multipart/form-data — caller builds the FormData object.
 *
 * @param {string}   customerId  Resolved customer ID
 * @param {FormData} form        Populated form-data instance
 * @param {string}   token       Valid bearer token
 * @returns {Promise<string>}    The new ticket ID from the API response
 */
async function createServiceTicket(customerId, form, token) {
  logger.debug("Submitting service ticket", { customerId });

  const response = await axios.post(
    `${BASE_URL}/occ/v2/tatahitachi-spa/users/${customerId}/support-ticket/`,
    form,
    {
      headers: {
        ...commonHeaders(token),
        ...form.getHeaders(), // sets correct Content-Type + boundary
      },
      params: { lang: "en", curr: "INR" },
    },
  );

  const ticketId = response.data.id;
  logger.info("Service ticket submitted", { customerId, ticketId });
  return ticketId;
}

/**
 * helper/handlers/edost-create-ticket.handler.js
 *
 * Handles the CREATE_TICKET flow submission.
 *
 * Flow:
 *  1. withMachineTokenRetry  → get/refresh token from Redis cache
 *  2. fetchCustomerId(from)  → resolve WhatsApp number → customerId
 *  3. createServiceTicket()  → POST multipart/form-data to support-ticket API
 *  4. Send success/failure message back to the user on WhatsApp
 */

const api = new WhatsAppAPI();

/**
 * @param {string} from     WhatsApp number of the user, e.g. "+918792426168"
 * @param {object} details  Parsed flow response_json from the WhatsApp Flow
 */

const formatDate = (dateStr) => {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
};

export async function handleCreateTicket(from, details) {
  logger.info("Create-ticket submission started", { from, details });

  try {
    const ticketId = await withMachineTokenRetry(async (token) => {
      // Step 1 — resolve phone number to customerId
      const customerId = await fetchCustomerId(details.phone_number, token);

      // Step 2 — build multipart form from flow details
      const form = new FormData();
      form.append("subject", details.description);
      form.append("machineSerialNumber", details.serial_number);
      form.append("hitachiTicketCategory", details.issue_type ?? "Z004");
      form.append("malfunctionDate", formatDate(details.service_date));
      form.append("currentLocation", details.district);
      form.append("currentState", details.state);
      form.append("language", details.preferred_language ?? "English");

      // Step 3 — submit the ticket
      return createServiceTicket(customerId, form, token);
    });

    logger.info("Service ticket created", { from, ticketId });

    await api.sendText(
      from,
      `✅ Your service request has been submitted successfully!\n\n*Ticket ID:* ${ticketId}`,
    );
  } catch (err) {
    logger.error("Create-ticket failed", {
      from,
      status: err.response?.status,
      data: err.response?.data,
      err: err.message,
    });

    await api.sendText(
      from,
      "❌ We couldn't submit your service request. Please try again or contact support.",
    );
  }
}
