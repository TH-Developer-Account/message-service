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
import logger from "./helper/utils/logger.js";
import { httpLogger } from "./middleware/http-logger.js";
import { webhookRouter } from "./routes/webhook.route.js";
import { flowRouter } from "./routes/flow.route.js";

const app = express();
const PORT = process.env.PORT || 3000;

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

// ─── Routes ───────────────────────────────────────────────────────────────
app.use("/webhook", webhookRouter);
app.use("/fetch-machine-serials", flowRouter);

// ─── Health ───────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    sap_connection: process.env.SAP_CONNECTION_TYPE || "mock",
    timestamp: new Date().toISOString(),
  });
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

// ─── Start ────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info("Server started", {
    port: PORT,
    env: process.env.NODE_ENV || "development",
    sap_connection: process.env.SAP_CONNECTION_TYPE || "mock",
  });
});

export default app;
