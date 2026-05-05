/**
 * helper/webhook.js — incoming message dispatcher
 *
 * Sole responsibility: iterate the Meta webhook payload, deduplicate
 * messages, resolve the contact name, and hand each message off to
 * routeMessage. No business logic lives here.
 */
import { isDuplicateMessage } from "./dedup.js";
import { handleText } from "./handlers/text.handler.js";
import { handleButton } from "./handlers/button.handler.js";
import { handleButtonReply } from "./handlers/flow-reply.handler.js";
import { whatsappApi as api } from "../services/whatsapp-api.js";
import logger from "./utils/logger.js";

// ─── Main dispatcher ──────────────────────────────────────────────────────
export async function handleWebhook(body) {
  logger.debug("Webhook body received", { body });

  const entries = body?.entry ?? [];

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;

      const value = change.value;
      const contacts = value.contacts ?? [];

      for (const status of value.statuses ?? []) {
        logDeliveryStatus(status);
      }

      for (const message of value.messages ?? []) {
        const isDuplicate = await isDuplicateMessage(message.id);
        if (isDuplicate) {
          logger.warn("Duplicate message skipped", { messageId: message.id });
          continue;
        }

        const contact = contacts.find((c) => c.wa_id === message.from);
        const name = contact?.profile?.name || "there";

        try {
          await routeMessage(message, name);
        } catch (err) {
          logger.error("Error handling message", {
            from: message.from,
            type: message.type,
            err: err.message,
            stack: err.stack,
          });
        }
      }
    }
  }
}

// ─── Router ───────────────────────────────────────────────────────────────
async function routeMessage(message, name) {
  const from = message.from;
  logger.debug("Routing message", { from, type: message.type });

  switch (message.type) {
    case "text":
      await handleText(from, name, message.text.body.trim());
      break;

    case "button":
      await handleButton(from, message.button.payload);
      break;

    case "interactive":
      if (message.interactive.type === "nfm_reply") {
        await handleButtonReply(from, message.interactive.nfm_reply);
      }
      break;

    default:
      logger.warn("Unsupported message type", { from, type: message.type });
      await api.sendText(
        from,
        "Please send your Purchase Order number as a text message (e.g. *4500012345*).",
      );
  }
}

// ─── Delivery status logger ───────────────────────────────────────────────
function logDeliveryStatus({ id, status: state, recipient_id, errors }) {
  if (state === "failed") {
    logger.error("Message delivery failed", {
      messageId: id,
      recipient_id,
      errors,
    });
  } else {
    logger.info("Message delivery status", {
      messageId: id,
      recipient_id,
      state,
    });
  }
}
