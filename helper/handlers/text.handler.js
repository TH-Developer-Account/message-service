/**
 * helper/handlers/text.handler.js
 *
 * Handles plain text messages from the user.
 *  - Greeting keywords → send welcome / main menu
 *  - Anything else     → send help with instructions
 */
import { WhatsAppAPI } from "../../services/whatsapp-api.js";
import logger from "../utils/logger.js";

const api = new WhatsAppAPI();

const GREETING_REGEX = /^(hi|hello|hey|start|help|menu|track|status|check)$/i;

export async function handleText(from, name, text) {
  if (GREETING_REGEX.test(text)) {
    logger.info("Greeting received — sending welcome", { from });
    await api.sendWelcome(from);
    return;
  }

  logger.info("Unrecognised text — sending help", { from, text });
  await api.sendHelp(from, name);
}
