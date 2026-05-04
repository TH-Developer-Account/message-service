/**
 * server.js — app entry point
 *
 * Responsibilities:
 *  - Create the Express app
 *  - Register middleware
 *  - Mount route modules
 *  - Start the HTTP server
 *
 * Nothing else. Business logic lives in routes/ and helper/.
 */

import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import logger from "./helper/utils/logger.js";
import { httpLogger } from "./middleware/http-logger.js";
import { startWebhookWorker } from "./queue-service/webhook.worker.js";
import { webhookRouter } from "./routes/webhook.route.js";
import { flowRouter } from "./routes/flow.route.js";
import { redis } from "./config/redis.js";

// ─── Startup env validation ───────────────────────────────────────────────
const REQUIRED_VARS = [
  "META_APP_SECRET",
  "WEBHOOK_VERIFY_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_PERMANENT_ACCESS_TOKEN",
  "WHATSAPP_FLOW_PRIVATE_KEY",
  "SAP_USERNAME",
  "SAP_PASSWORD",
  "MOBILITY_USERNAME",
  "MOBILITY_PASSWORD",
  "EDOST_CLIENT_ID",
  "EDOST_CLIENT_SECRET",
];

const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
if (missing.length > 0) {
  logger.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Traffic path: Internet → ALB (TLS) → Nginx → Node.js (2 proxy hops).
// Without this, req.ip = Nginx's container IP and per-IP rate limiting is broken.
app.set("trust proxy", 2);

// Uncaught exceptions leave the process in an unknown state — log and exit
// so PM2 can restart cleanly rather than serving from a broken state.
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception — exiting", {
    err: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason: String(reason) });
});

// ─── Raw body capture (required for Meta HMAC signature verification) ─────
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// ─── HTTP access log ──────────────────────────────────────────────────────
app.use(httpLogger);

// ─── Rate limiting ────────────────────────────────────────────────────────
// Webhook: Meta sends at most a few hundred requests/min even at high load
const webhookLimiter = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests",
});

// Flow endpoint: one user can only be in one flow step at a time
const flowLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests",
});

// ─── Request logger (temporary debug) ────────────────────────────────────
app.use((req, res, next) => {
  logger.info("Incoming request", {
    method: req.method,
    path: req.path,
    ip: req.ip,
    contentType: req.headers["content-type"],
  });
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────
app.use("/webhook", webhookLimiter, webhookRouter);
app.use("/fetch-machine-serials", flowLimiter, flowRouter);

// ─── Health ───────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    sap_connection: process.env.SAP_CONNECTION_TYPE || "odata",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health/deep", async (_req, res) => {
  try {
    await redis.ping();
    res.json({
      status: "ok",
      redis: "ok",
      timestamp: new Date().toISOString(),
    });
    // eslint-disable-next-line unused-imports/no-unused-vars
  } catch (err) {
    res.status(503).json({
      status: "degraded",
      redis: "unreachable",
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── Unhandled Express errors ─────────────────────────────────────────────
// Catches any error passed via next(err) inside route handlers.
// eslint-disable-next-line unused-imports/no-unused-vars
app.use((err, req, res, next) => {
  // eslint-disable-line no-unused-vars
  logger.error("Unhandled Express error", {
    err: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
  });
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Start worker + server ────────────────────────────────────────────────
const worker = startWebhookWorker(); // BullMQ worker — consumes the webhook queue

const server = app.listen(PORT, () => {
  logger.info("Server started", {
    port: PORT,
    env: process.env.NODE_ENV || "development",
    sap_connection: process.env.SAP_CONNECTION_TYPE || "odata",
  });
  // Signal PM2 that this worker is ready to receive traffic.
  // Required for zero-downtime `pm2 reload` — PM2 won't cut over until it
  // sees this signal, so in-flight requests on the old worker finish first.
  if (process.send) process.send("ready");
});

// Keep-alive connections respect Axios 30 s timeout + a small buffer
server.setTimeout(35_000);

// ─── Graceful shutdown ────────────────────────────────────────────────────
// ALB sends SIGTERM when draining a target. PM2 sends SIGTERM on `pm2 reload`.
// Sequence: stop accepting → drain HTTP → close BullMQ worker → quit Redis → exit.
const shutdown = async (signal) => {
  logger.info(`${signal} received — starting graceful shutdown`);

  // Hard deadline: if shutdown hangs (stuck job, slow SAP call), force-exit
  // after 30 s so PM2 doesn't wait forever.
  const forceExit = setTimeout(() => {
    logger.error("Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, 30_000);
  forceExit.unref(); // don't keep the event loop alive just for this timer

  server.close(async () => {
    logger.info("HTTP server closed — no new connections accepted");
    try {
      await worker.close(); // waits for in-flight BullMQ jobs to finish
      logger.info("BullMQ worker closed");
      await redis.quit();
      logger.info("Redis connection closed");
    } catch (err) {
      logger.error("Error during shutdown cleanup", { err: err.message });
    }
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
