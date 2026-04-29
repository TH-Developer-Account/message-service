/**
 * middleware/http-logger.js
 *
 * Morgan HTTP access log middleware that writes through Winston so every
 * incoming request appears in the same log files as application events.
 *
 * Each line is logged at the "http" level, which is suppressed in
 * production (MIN_LEVEL = "info") to keep combined.log focused on
 * application events. Set NODE_ENV=development locally to see them.
 *
 * Log format:
 *   :method :url :status :res[content-length] - :response-time ms
 *
 * Usage — mount BEFORE routes in server.js:
 *   import { httpLogger } from './middleware/http-logger.js';
 *   app.use(httpLogger);
 */

import morgan from "morgan";
import logger from "../helper/utils/logger.js";

// Morgan writes to a stream; we bridge that stream to Winston's http level.
const stream = {
  write: (message) => logger.http(message.trim()),
};

// Skip logging for health-check calls so they don't pollute the access log.
const skip = (req) => req.path === "/health";

export const httpLogger = morgan(
  ":method :url :status :res[content-length] - :response-time ms",
  { stream, skip },
);
