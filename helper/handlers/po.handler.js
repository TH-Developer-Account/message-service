/**
 * helper/handlers/po.handler.js
 *
 * Looks up a Purchase Order (or Sales Order) in SAP and sends the
 * formatted status back to the user via WhatsApp.
 */
import { SAPService, normalizePONumber } from "../../services/sap-service.js";
import { WhatsAppAPI } from "../../services/whatsapp-api.js";
import logger from "../utils/logger.js";

const api = new WhatsAppAPI();
const sap = new SAPService();

export async function handlePOLookup(from, rawPO, isSalesOrder) {
  const poNumber = normalizePONumber(rawPO);
  logger.info("PO lookup started", { poNumber, from, isSalesOrder });

  let po;
  try {
    po = await sap.getPOStatus(poNumber, isSalesOrder);
  } catch (err) {
    await sendSAPError(from, poNumber, err);
    return;
  }

  if (po) {
    logger.info("PO lookup succeeded", { poNumber });
    await api.sendText(from, po);
  } else {
    logger.warn("PO lookup returned empty result", { poNumber });
    await api.sendText(
      from,
      "Not able to fetch the status. Please try again later!",
    );
  }
}

// ─── Error handler ────────────────────────────────────────────────────────
async function sendSAPError(from, poNumber, err) {
  if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") {
    logger.error("SAP host unreachable", { code: err.code, poNumber });
    await api.sendText(
      from,
      "⚠️ Could not reach SAP system. Please try again shortly.",
    );
    return;
  }
  logger.error("SAP query failed", {
    poNumber,
    err: err.message,
    stack: err.stack,
  });
  await api.sendText(
    from,
    "⚠️ Our system is temporarily unavailable. Please try again in a moment or contact support.",
  );
}
