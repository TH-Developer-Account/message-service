/**
 * middleware/verify-meta-signature.js
 *
 * Validates the X-Hub-Signature-256 header that Meta attaches to every
 * webhook POST. Rejects any request that doesn't carry a valid signature
 * so forged payloads never reach the message handler.
 *
 * Requires:
 *  - express.json({ verify: (req, _res, buf) => { req.rawBody = buf } })
 *    mounted before this middleware so req.rawBody is populated.
 *  - META_APP_SECRET set in the environment.
 */
import crypto from "node:crypto";
import logger from "../helper/utils/logger.js";

export function verifyMetaSignature(req, res, next) {
  const sig = req.headers["x-hub-signature-256"];

  if (!sig) {
    logger.warn("Missing X-Hub-Signature-256 header", { ip: req.ip });
    return res.sendStatus(403);
  }

  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", process.env.META_APP_SECRET)
      .update(req.rawBody)
      .digest("hex");

  // timingSafeEqual prevents timing-based attacks; buffers must be the same
  // length, so a length mismatch is caught by the try/catch as a rejection.
  try {
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);

    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      logger.warn("Signature mismatch — request rejected", {
        ip: req.ip,
        hint: "Verify META_APP_SECRET matches App Settings → Basic in Meta Dashboard",
      });
      return res.sendStatus(403);
    }
  } catch {
    logger.warn("Signature comparison failed (buffer length mismatch)", {
      ip: req.ip,
    });
    return res.sendStatus(403);
  }

  next();
}
