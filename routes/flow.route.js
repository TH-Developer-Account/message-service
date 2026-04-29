/**
 * routes/flow.route.js
 *
 * POST /fetch-machine-serials
 *
 * Handles WhatsApp Flow data-exchange requests. Meta encrypts the payload
 * with the app's RSA public key; we decrypt, dispatch to the right screen
 * handler, re-encrypt the response, and send it back.
 */
import { Router } from "express";
import crypto from "node:crypto";
import {
  decryptRequest,
  encryptResponse,
  getPrivateKey,
} from "../helper/encrypt-decrypt.js";
import { SCREEN_HANDLERS } from "../helper/flow-screens/index.js";
import logger from "../helper/utils/logger.js";

export const flowRouter = Router();

// ─── AES key + IV extraction ──────────────────────────────────────────────
// Extracted here so the route handler stays readable.
function extractAesKeyAndIV(body) {
  const decryptedAesKey = crypto.privateDecrypt(
    {
      key: getPrivateKey(),
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(body.encrypted_aes_key, "base64"),
  );
  const iv = Buffer.from(body.initial_vector, "base64");
  return { decryptedAesKey, iv };
}

// ─── Flow data exchange ───────────────────────────────────────────────────
flowRouter.post("/", async (req, res) => {
  let decryptedAesKey, iv;

  try {
    const payload = decryptRequest(req.body);
    logger.debug("Flow payload received", { action, screen });

    const { action, screen, data } = payload;
    ({ decryptedAesKey, iv } = extractAesKeyAndIV(req.body));

    // Meta sends a ping to confirm the endpoint is reachable
    if (action === "ping") {
      logger.info("Flow ping received — responding active");
      const response = { version: "3.0", data: { status: "active" } };
      return res.send(encryptResponse(response, decryptedAesKey, iv));
    }

    const screenHandler = SCREEN_HANDLERS[screen];
    if (!screenHandler) {
      logger.warn("Unhandled flow screen", { screen, action });
      return res.status(200).send("OK");
    }

    const responseData = await screenHandler(data);
    return res.send(encryptResponse(responseData, decryptedAesKey, iv));
  } catch (err) {
    logger.error("Flow handler error", { err: err.message, stack: err.stack });
    res.status(500).send("Internal Server Error");
  }
});
