/**
 * helper/handlers/flow-reply.handler.js
 *
 * Handles nfm_reply interactive messages — the payload Meta sends when a
 * user completes a WhatsApp Flow. Parses the response JSON and dispatches
 * to the appropriate lookup handler based on flow_token.
 */
import { TEMPLATES } from "../constant.js";
import { handlePOLookup } from "./po.handler.js";
import { handleSRLookup } from "./sr.handler.js";
import { WhatsAppAPI } from "../../services/whatsapp-api.js";
import logger from "../utils/logger.js";

const api = new WhatsAppAPI();

export async function handleButtonReply(from, buttonId) {
  if (buttonId?.name !== "flow") return;

  let details;
  try {
    details = JSON.parse(buttonId.response_json);
  } catch (err) {
    logger.error("Failed to parse flow response_json", {
      err: err.message,
      from,
    });
    await api.sendText(from, "❌ Something went wrong. Please try again.");
    return;
  }

  logger.debug("Flow reply received", { flowToken: details.flow_token, from });

  switch (details.flow_token) {
    case TEMPLATES.PO_STATUS.flowToken: {
      const poNumber = details.po_number || details.sales_doc_number;
      const isSalesOrder = !!details.sales_doc_number;
      await handlePOLookup(from, poNumber, isSalesOrder);
      break;
    }

    case TEMPLATES.SERVICE_TICKET.flowToken: {
      await handleSRLookup(from, details.service_ticket_number);
      break;
    }

    case TEMPLATES.CREATE_TICKET.flowToken: {
      logger.info("Create-ticket flow submitted", { details });
      // TODO: implement create-ticket handler
      break;
    }

    default:
      logger.warn("Unknown flow_token received", {
        flowToken: details.flow_token,
        from,
      });
      break;
  }
}
