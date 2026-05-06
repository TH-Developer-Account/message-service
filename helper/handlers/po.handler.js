/**
 * helper/handlers/po.handler.js
 *
 * Looks up a Purchase Order (or Sales Order) in SAP and sends the
 * formatted status back to the user via WhatsApp.
 */
import { SAPService, normalizePONumber } from "../../services/sap-service.js";
import { whatsappApi as api } from "../../services/whatsapp-api.js";
import logger from "../utils/logger.js";
const sap = new SAPService();

export async function handleCombinedPOLookup(from, { tata, dealer }) {
  if (!tata && !dealer) {
    await api.sendText(
      from,
      "Please provide at least one PO or Sales Order number.",
    );
    return;
  }

  // Run both lookups in parallel — neither blocks the other
  const [tataResult, dealerResult] = await Promise.allSettled([
    tata
      ? sap._fetchViaOData(normalizePONumber(tata.poNumber), tata.isSalesOrder)
      : Promise.resolve(null),
    dealer
      ? sap._fetchViaBYD(
          normalizePONumber(dealer.poNumber),
          dealer.isSalesOrder,
        )
      : Promise.resolve(null),
  ]);

  // ── Tata Hitachi result ──
  if (tata) {
    if (tataResult.status === "fulfilled" && tataResult.value) {
      await api.sendText(
        from,
        `*Tata Hitachi Fulfillment:*\n${tataResult.value}`,
      );
    } else {
      const err = tataResult.reason;
      logger.error("Tata Hitachi PO lookup failed", { err });
      await api.sendText(
        from,
        `*Tata Hitachi Fulfillment:*\nNot able to fetch status for ${tata.poNumber}. Please try again later.`,
      );
    }
  }

  // ── Dealer result ──
  if (dealer) {
    if (dealerResult.status === "fulfilled" && dealerResult.value) {
      await api.sendText(from, `*Dealer Fulfillment:*\n${dealerResult.value}`);
    } else {
      const err = dealerResult.reason;
      logger.error("Dealer PO lookup failed", { err });
      await api.sendText(
        from,
        `*Dealer Fulfillment:*\nNot able to fetch status for ${dealer.poNumber}. Please try again later.`,
      );
    }
  }
}
