/**
 * helper/handlers/button.handler.js
 *
 * Handles quick-reply button taps from the main menu.
 * Each button payload maps to a WhatsApp Flow template via BUTTON_TEMPLATE_MAP.
 * Adding a new button only requires a new entry in the map.
 */
import { whatsappApi as api } from "../../services/whatsapp-api.js";
import { TEMPLATES } from "../constant.js";
import logger from "../utils/logger.js";

// Map button payload labels → template config objects
const BUTTON_TEMPLATE_MAP = {
  "Order Status": TEMPLATES.PO_STATUS,
  "Service Ticket Status": TEMPLATES.SERVICE_TICKET,
  "Create Service Ticket": TEMPLATES.CREATE_TICKET,
  "Register Operator": TEMPLATES.REGISTER_OPERATOR,
};

export async function handleButton(from, payload) {
  const template = BUTTON_TEMPLATE_MAP[payload];

  if (template) {
    logger.info("Sending flow template", {
      payload,
      templateName: template.name,
      from,
    });

    await api.sendTemplate({
      to: from,
      templateName: template.name,
      flowToken: template.flowToken,
    });
    return;
  }

  // Unknown payload — fall back to help message
  logger.warn("Unknown button payload", { payload, from });
  await api.sendHelp(from, payload);
}
