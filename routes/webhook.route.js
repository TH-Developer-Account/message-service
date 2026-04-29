/**
 * routes/webhook.route.js
 *
 * Two endpoints:
 *  GET  /webhook  — Meta's one-time hub verification challenge
 *  POST /webhook  — Incoming WhatsApp messages (signature-verified)
 */
import { Router } from "express";
import { verifyMetaSignature } from "../middleware/verify-meta-signature.js";
import { handleWebhook } from "../helper/webhook.js";
import logger from "../helper/utils/logger.js";

export const webhookRouter = Router();

// ─── Hub verification ─────────────────────────────────────────────────────
webhookRouter.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    logger.info("Webhook verified by Meta");
    return res.status(200).send(challenge);
  }

  logger.warn("Webhook verification failed", { mode, ip: req.ip });
  res.sendStatus(403);
});

// ─── Incoming messages ────────────────────────────────────────────────────
// Meta requires a 200 acknowledgement within ~5 s; we send it immediately
// and process the payload asynchronously so any slow SAP/Mobility call
// never causes a timeout on Meta's side.
webhookRouter.post("/", verifyMetaSignature, async (req, res) => {
  res.sendStatus(200); // Ack Meta immediately — headers now sent
  try {
    await handleWebhook(req.body);
  } catch (err) {
    // Cannot change the response status at this point; log only.
    logger.error("Webhook processing error", {
      err: err.message,
      stack: err.stack,
    });
  }
});
