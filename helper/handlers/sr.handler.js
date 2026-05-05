/**
 * helper/handlers/sr.handler.js
 *
 * Fetches Service Request details from the Mobility API and sends the
 * formatted result to the user. Uses withTokenRetry so a single expired
 * token doesn't require the user to try again manually.
 */
import { fetchServiceDetails } from "../mobility.helper.js";
import { formatServiceMessage } from "../constant.js";
import { withTokenRetry } from "../utils/mobility-token-retry.js";
import { whatsappApi as api } from "../../services/whatsapp-api.js";
import logger from "../utils/logger.js";

export async function handleSRLookup(from, srNo) {
  logger.info("SR lookup started", { srNo, from });

  try {
    const data = await withTokenRetry((token) =>
      fetchServiceDetails(srNo, token),
    );
    const message = formatServiceMessage(data);
    logger.info("SR lookup succeeded", { srNo });
    await api.sendText(from, message);
  } catch (err) {
    logger.error("SR lookup failed", {
      srNo,
      status: err.response?.status,
      err: err.response?.data || err.message,
      stack: err.stack,
    });
    await api.sendText(
      from,
      "❌ Unable to fetch service details. Please try again later.",
    );
  }
}
