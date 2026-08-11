/**
 * middleware/internal-auth.js
 *
 * Guards internal service-to-service routes.
 * Rejects any request that does not carry the correct x-api-key header.
 */
import logger from "../helper/utils/logger.js";

export function internalAuth(req, res, next) {
  const key = req.headers["x-api-key"];

  if (!key || key !== process.env.MAP_API_KEY) {
    logger.warn("Unauthorized internal request rejected", {
      ip: req.ip,
      path: req.path,
    });
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}
