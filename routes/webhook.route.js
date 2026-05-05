/**
 * routes/webhook.route.js
 *
 * Two endpoints:
 *  GET  /webhook  — Meta's one-time hub verification challenge
 *  POST /webhook  — Incoming WhatsApp messages (signature-verified)
 */
import { Router } from "express";
import { verifyMetaSignature } from "../middleware/verify-meta-signature.js";
import { webhookQueue } from "../queue-service/webhook.queue.js";
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
  // Acknowledge Meta immediately — before any processing
  res.sendStatus(200);

  try {
    const body = req.body;

    // Check if this payload actually contains any messages
    // Payloads with only delivery statuses (sent/delivered/read)
    // have no messages array — no point queuing them
    const hasMessages = body?.entry?.some((entry) =>
      entry.changes?.some((change) => {
        const messages = change.value?.messages;
        return messages && messages.length > 0;
      }),
    );

    if (!hasMessages) {
      logger.debug("Webhook payload has no messages — skipping queue");
      return;
    }

    const job = await webhookQueue.add("incoming", body);
    logger.debug("Webhook payload enqueued", { jobId: job.id });
  } catch (err) {
    // Queue is down — log it. Meta will retry the webhook automatically
    // because we already sent 200... except we didn't want that.
    // See note below on why we still send 200 here.
    logger.error("Failed to enqueue webhook payload", {
      err: err.message,
      body: req.body,
    });
    /**
     * NOTE: We send 200 even when enqueuing fails because:
     *  - If we send a non-200, Meta retries — but our queue is down,
     *    so the retry will also fail to enqueue.
     *  - The raw body is logged above so you can replay it manually.
     *  - Once Redis recovers, normal flow resumes for new messages.
     * If you want Meta to retry instead, change this to res.sendStatus(500)
     * BEFORE the res.sendStatus(200) above — but be aware Meta's retry
     * schedule is not guaranteed and could cause duplicates.
     */
  }
});
