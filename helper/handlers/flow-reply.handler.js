/**
 * helper/handlers/flow-reply.handler.js
 *
 * Handles nfm_reply interactive messages — the payload Meta sends when a
 * user completes a WhatsApp Flow. Parses the response JSON and dispatches
 * to the appropriate lookup handler based on flow_token.
 */
import { TEMPLATES } from "../constant.js";
import { handleCombinedPOLookup } from "./po.handler.js";
import { handleSRLookup } from "./sr.handler.js";
import { handleCreateTicket } from "../../services/edost-create-service-ticket.handler.js";
import { handleRegisterOperator } from "./register-operator.handler.js";
import { whatsappApi as api } from "../../services/whatsapp-api.js";
import logger from "../utils/logger.js";

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
      const tataInput = details.po_number || details.sales_doc_number;
      const isSalesOrder = !!details.sales_doc_number;

      const dealerInput =
        details.dealer_po_number || details.dealer_sales_doc_number;
      const isDealerSalesOrder = !!details.dealer_sales_doc_number;

      await handleCombinedPOLookup(from, {
        tata: tataInput ? { poNumber: tataInput, isSalesOrder } : null,
        dealer: dealerInput
          ? { poNumber: dealerInput, isSalesOrder: isDealerSalesOrder }
          : null,
      });
      break;
    }

    case TEMPLATES.SERVICE_TICKET.flowToken: {
      await handleSRLookup(from, details.service_ticket_number);
      break;
    }

    case TEMPLATES.CREATE_TICKET.flowToken: {
      logger.info("Create-ticket flow submitted", { details });
      await handleCreateTicket(from, details);
      // TODO: implement create-ticket handler
      break;
    }

    case TEMPLATES.REGISTER_OPERATOR.flowToken: {
      logger.info("Register-operator flow submitted", { from });
      await handleRegisterOperator(from, details);
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
