/**
 * helper/queue/webhook.worker.js
 *
 * BullMQ worker — consumes jobs from the "webhooks" queue and passes
 * each payload to the existing handleWebhook dispatcher.
 *
 * Lifecycle:
 *  - Started once from server.js at boot
 *  - On job failure BullMQ retries automatically (exponential backoff)
 *  - On process restart any in-flight jobs are re-queued by BullMQ
 *
 * Nothing in this file changes your business logic — handleWebhook is
 * called exactly as before, just from here instead of the route handler.
 */
import { Worker } from "bullmq";
import { handleWebhook } from "../helper/webhook.js";
import logger from "../helper/utils/logger.js";

const connection = {
  url: process.env.REDIS_URL,
};

// ─── Worker ───────────────────────────────────────────────────────────────
export function startWebhookWorker() {
  const worker = new Worker(
    "webhooks",
    async (job) => {
      logger.info("Processing webhook job", {
        jobId: job.id,
        attempt: job.attemptsMade + 1,
      });
      await handleWebhook(job.data);
    },
    {
      connection,

      /**
       * How many webhook payloads to process simultaneously.
       *
       * Each Meta webhook payload can contain multiple messages inside it,
       * and handleWebhook already iterates them sequentially. So concurrency
       * here means "how many webhook payloads at the same time", not
       * "how many messages". 5 is a safe default — raise if your third
       * party API can handle more parallel calls.
       */
      concurrency: 5,
    },
  );

  // ─── Worker events ──────────────────────────────────────────────────────
  worker.on("completed", (job) => {
    logger.info("Webhook job completed", { jobId: job.id });
  });

  worker.on("failed", (job, err) => {
    const isFinal = job.attemptsMade >= job.opts.attempts;
    const logFn = isFinal ? logger.error : logger.warn;

    logFn("Webhook job failed", {
      jobId: job.id,
      attempt: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      isFinal,
      err: err.message,
    });
  });

  worker.on("error", (err) => {
    logger.error("Webhook worker error", { err: err.message });
  });

  // Graceful shutdown — let in-flight jobs finish before the process exits
  const shutdown = async (signal) => {
    logger.info(`${signal} received — closing webhook worker`);
    await worker.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  logger.info("Webhook worker started", { concurrency: 5 });
  return worker;
}
