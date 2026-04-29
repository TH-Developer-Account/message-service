/**
 * helper/queue/webhook.queue.js
 *
 * Defines the BullMQ queue used to buffer incoming Meta webhook payloads.
 * The queue is backed by Redis — jobs survive a process restart.
 *
 * Only the queue instance lives here. The worker (consumer) is in
 * webhook.worker.js. Route handlers import this file to enqueue jobs.
 */
import { Queue } from "bullmq";
import logger from "../helper/utils/logger.js";

const connection = {
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
};

export const webhookQueue = new Queue("webhooks", {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2000, // 2s → 4s → 8s → 16s → 32s
    },
    removeOnComplete: 100, // keep the last 100 completed jobs for inspection
    removeOnFail: 500, // keep the last 500 failed jobs for debugging
  },
});

webhookQueue.on("error", (err) => {
  logger.error("Webhook queue error", { err: err.message });
});
