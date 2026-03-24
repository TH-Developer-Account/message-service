/**
 * server.js — WhatsApp PO Tracker Server
 *
 * Endpoints:
 *  GET  /webhook               → Meta webhook verification
 *  POST /webhook               → Incoming messages (signature verified)
 *  POST /api/notify-po-update  → Trigger proactive PO status notification
 *  GET  /api/po/:poNumber      → Manual PO lookup (for testing)
 *  GET  /health                → Health check
 */

import express from "express";
import dotenv from "dotenv";
import { handleWebhook } from "./helper/webhook.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Raw body for signature verification ─────────────────────────────────
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// ─── Health ────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({
    status: "ok",
    sap_connection: process.env.SAP_CONNECTION_TYPE || "mock",
    timestamp: new Date().toISOString(),
  }),
);

// Verification endpoint
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("mode==============>", mode);
  console.log("token==============>", token);
  console.log("challenge==============>", challenge);

  if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log("Webhook verified");
    res.status(200).send(challenge);
  } else {
    console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++");
    res.sendStatus(403);
  }
});

// Usage in your route handler:
app.post("/webhook", async (req, res) => {
  try {
    res.sendStatus(200);
    await handleWebhook(req.body);
  } catch (err) {
    console.error("Decryption failed:", err);
    res.status(400).json({ error: "Decryption failed" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Status Tracker running on port ${PORT}`);
});

export default app;
