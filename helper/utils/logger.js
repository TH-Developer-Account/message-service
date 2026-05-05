/**
 * helper/utils/logger.js
 *
 * Single logger instance shared across the entire application.
 * Import and use instead of console.log / console.error everywhere.
 *
 * Transports:
 *  - Console          → colorized, human-readable  (development only)
 *  - logs/combined-%DATE%.log → info and above, JSON, rotated daily
 *  - logs/error-%DATE%.log   → error level only,   JSON, rotated daily
 *
 * Log retention: 14 days. Each file is capped at 20 MB.
 *
 * Usage:
 *   import logger from './utils/logger.js';
 *   logger.info('Server started', { port: 3000 });
 *   logger.error('SAP query failed', { err, poNumber });
 *   logger.warn('Duplicate message skipped', { messageId });
 *   logger.debug('Raw webhook body', { body });   // only emitted in development
 *   logger.http('POST /webhook 200');              // HTTP access log level
 *
 * Log levels (lowest → highest severity):
 *   debug | http | info | warn | error
 *
 * Environment:
 *   NODE_ENV=production  → minimum level: info  (debug + http suppressed)
 *   NODE_ENV=development → minimum level: debug (all levels emitted)
 */

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.resolve(__dirname, "../../logs");

const IS_PROD = process.env.NODE_ENV === "production";
const MIN_LEVEL = IS_PROD ? "info" : "debug";

// ─── Formats ──────────────────────────────────────────────────────────────

/**
 * JSON format used for file transports.
 * Adds a timestamp and flattens any nested `err` / `error` object so stack
 * traces are captured in the log file.
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

/**
 * Colorized, single-line format for the console transport.
 * Includes the log level, timestamp, message, and any extra metadata.
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const extras = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
    return `[${timestamp}] ${level}: ${message}${extras}`;
  }),
);

// ─── Transports ───────────────────────────────────────────────────────────

const transports = [];

// Console — dev only so EC2 stdout isn't flooded in production
if (!IS_PROD) {
  transports.push(new winston.transports.Console({ format: consoleFormat }));
}

// Combined log — all messages at info level and above
transports.push(
  new DailyRotateFile({
    dirname: LOG_DIR,
    filename: "combined-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    maxFiles: "7d", // keep 14 days
    maxSize: "20m", // rotate at 20 MB regardless of date
    level: "info",
    format: fileFormat,
    zippedArchive: true,
  }),
);

// Error log — only error-level messages for quick incident triage
transports.push(
  new DailyRotateFile({
    dirname: LOG_DIR,
    filename: "error-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    maxFiles: "14d", // keep errors longer for post-incident review
    maxSize: "20m",
    level: "error",
    format: fileFormat,
    zippedArchive: true,
  }),
);

// ─── Logger instance ──────────────────────────────────────────────────────

const logger = winston.createLogger({
  level: MIN_LEVEL,
  transports,
  // Catch unhandled exceptions and rejections so they appear in the error log
  exceptionHandlers: [
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: "exceptions-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "14d",
      maxSize: "20m",
      format: fileFormat,
      zippedArchive: true,
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: "rejections-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "14d",
      maxSize: "20m",
      format: fileFormat,
      zippedArchive: true,
    }),
  ],
  // Don't exit on handled exceptions
  exitOnError: false,
});

export default logger;
