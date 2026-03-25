/**
 * webhook.js — Incoming WhatsApp message handler
 *
 * Flow:
 *  1. User sends any message → bot checks if it's a PO number
 *  2. If yes → query SAP → send formatted status reply
 *  3. If no  → send help message with instructions
 *
 * Conversation states (stored in memory):
 *  - IDLE            → waiting for first message
 *  - AWAITING_PO     → user said "track" / "status", now waiting for PO number
 */

import { WhatsAppAPI } from "../services/whatsapp-api.js";
import { SAPService, normalizePONumber } from "../services/sap-service.js";
import { isDuplicateMessage } from "./dedup.js";
import { TEMPLATES } from "./constant.js";

const api = new WhatsAppAPI();
const sap = new SAPService();

// ─── Main webhook dispatcher ──────────────────────────────────────────────
export async function handleWebhook(body) {
  const entries = body?.entry ?? [];

  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;

      const value = change.value;
      const contacts = value.contacts ?? [];
      const statuses = value.statuses ?? [];

      // Log delivery statuses silently
      for (const status of statuses) {
        logStatus(status);
      }

      for (const message of value.messages ?? []) {
        const messageId = message.id;
        // ✅ Dedup
        const isDuplicate = await isDuplicateMessage(messageId);
        if (isDuplicate) {
          console.log("⚠️ Duplicate skipped:", messageId);
          continue;
        }
        const contact = contacts.find((c) => c.wa_id === message.from);
        const name = contact?.profile?.name || "there";
        try {
          console.log("====================>", JSON.stringify(body, null, 2));
          await routeMessage(message, name);
        } catch (err) {
          console.error(`Error handling message from ${message.from}:`, err);
        }
      }
    }
  }
}

// ─── Message router ───────────────────────────────────────────────────────
async function routeMessage(message, name) {
  const from = message.from;

  if (message.type === "text") {
    await handleText(from, name, message.text.body.trim());
    return;
  }

  if (message.type === "button") {
    const name = message.button.payload;
    await handleButton(from, name);
    return;
  }

  if (message.type === "interactive") {
    const interactive = message.interactive;

    // Button reply
    if (interactive.type === "nfm_reply") {
      await handleButtonReply(from, name, interactive.nfm_reply);
      return;
    }
  }

  // Unsupported type
  await api.sendText(
    from,
    "Please send your Purchase Order number as a text message (e.g. *4500012345*).",
  );
}

// ─── Text message handler ─────────────────────────────────────────────────
async function handleText(from, name, text) {
  const lower = text.toLowerCase();

  // ── Greeting / start ──
  if (/^(hi|hello|hey|start|help|menu|track|status|check)$/i.test(lower)) {
    await api.sendWelcome(from);
    return;
  }

  // ── Default fallback ──
  await api.sendHelp(from, name);
}

// ─── Button message handler ─────────────────────────────────────────────────
async function handleButton(from, name) {
  switch (name) {
    case "PO Order Status":
      await api.sendTemplate({
        to: from,
        templateName: TEMPLATES.PO_STATUS.name,
        flowToken: TEMPLATES.PO_STATUS.flowToken,
      });
      break;

    case "Service Ticket Status":
      await api.sendTemplate({
        to: from,
        templateName: TEMPLATES.SERVICE_TICKET.name,
        flowToken: TEMPLATES.SERVICE_TICKET.flowToken,
      });
      break;

    default:
      // ── Default fallback ──
      await api.sendHelp(from, name);
      break;
  }
}

// ─── PO lookup & response ─────────────────────────────────────────────────
async function handlePOLookup(from, rawPO) {
  const poNumber = normalizePONumber(rawPO);

  console.log(`🔍 PO lookup: ${poNumber} for ${from}`);

  let po;
  try {
    po = await sap.getPOStatus(poNumber);
  } catch (err) {
    if (err.code === "ENOTFOUND") {
      await api.sendText(
        from,
        `❌ *PO Not Found*\n\n` +
          `Purchase Order *${poNumber}* was not found in our system.`,
      );
      return;
    }
    console.error("SAP query error:", JSON.stringify(err, null, 2));
    await api.sendText(
      from,
      `⚠️ Our system is temporarily unavailable. Please try again in a moment or contact support.`,
    );
    return;
  }

  const message = [
    "These are the Sale document Numbers:",
    ...po.map((doc) => `• ${doc}`),
  ].join("\n");

  await api.sendText(from, message);
}

async function handleSRLookup(from, srNo) {
  const message = "The status of the SR Ticket is completed.";
  console.log(message);
  await api.sendText(from, message);
}

// ─── Button reply handler ─────────────────────────────────────────────────
async function handleButtonReply(from, name, buttonId) {
  if (buttonId?.name === "flow") {
    const details = JSON.parse(buttonId.response_json);
    switch (details.flow_token) {
      case TEMPLATES.PO_STATUS.flowToken:
        const poNumber = details.po_number;
        await handlePOLookup(from, poNumber);
        break;
      case TEMPLATES.SERVICE_TICKET.flowToken:
        const serviceTicketNumber = details.service_ticket_number;
        await handleSRLookup(from, name, serviceTicketNumber);
        break;

      default:
        break;
    }

    return;
  }
}

// ─── Status log ───────────────────────────────────────────────────────────
function logStatus(status) {
  const { id, status: state, recipient_id, errors } = status;
  if (state === "failed") {
    console.error(`❌ Msg ${id} → ${recipient_id} FAILED:`, errors);
  } else {
    console.log(`📬 Msg ${id} → ${recipient_id}: ${state}`);
  }
}
