import crypto from "node:crypto";
import logger from "../helper/utils/logger.js"; // ← adjust path if different

let _cachedKey = null;

export const getPrivateKey = () => {
  if (_cachedKey) {
    logger.info("Private key loaded from cache");
    return _cachedKey;
  }

  const privateKey = process.env.WHATSAPP_FLOW_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("PRIVATE_KEY is not set in environment variables");
  }

  logger.info("Private key raw value check", {
    length: privateKey.length,
    startsCorrectly: privateKey.startsWith("-----BEGIN"),
    endsCorrectly: privateKey.endsWith("-----"),
    hasRealNewlines: privateKey.includes("\n"),
    hasEscapedNewlines: privateKey.includes("\\n"),
  });

  try {
    _cachedKey = crypto.createPrivateKey({ key: privateKey, format: "pem" });
    logger.info("Private key created successfully");
    return _cachedKey;
  } catch (err) {
    logger.error("Failed to create private key", { err: err.message });
    throw err;
  }
};

export const decryptRequest = (body) => {
  logger.info("decryptRequest called", {
    hasEncryptedAesKey: !!body.encrypted_aes_key,
    hasEncryptedFlowData: !!body.encrypted_flow_data,
    hasInitialVector: !!body.initial_vector,
  });

  try {
    const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;

    // Step 1 — Decrypt AES key
    logger.info("Decrypting AES key...");
    const decryptedAesKey = crypto.privateDecrypt(
      {
        key: getPrivateKey(),
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(encrypted_aes_key, "base64"),
    );
    logger.info("AES key decrypted", { aesKeyLength: decryptedAesKey.length });

    // Step 2 — Prepare IV and encrypted data
    const iv = Buffer.from(initial_vector, "base64");
    const encryptedFlowDataBuffer = Buffer.from(encrypted_flow_data, "base64");
    logger.info("Buffers prepared", {
      ivLength: iv.length,
      encryptedFlowDataLength: encryptedFlowDataBuffer.length,
    });

    // Step 3 — Separate auth tag
    const TAG_LENGTH = 16;
    const encryptedData = encryptedFlowDataBuffer.subarray(0, -TAG_LENGTH);
    const authTag = encryptedFlowDataBuffer.subarray(-TAG_LENGTH);
    logger.info("Auth tag separated", {
      encryptedDataLength: encryptedData.length,
      authTagLength: authTag.length,
    });

    // Step 4 — Decrypt flow data
    logger.info("Decrypting flow data...");
    const decipher = crypto.createDecipheriv(
      "aes-128-gcm",
      decryptedAesKey,
      iv,
    );
    decipher.setAuthTag(authTag);

    const decryptedData = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);
    logger.info("Flow data decrypted", {
      decryptedLength: decryptedData.length,
    });

    const parsed = JSON.parse(decryptedData.toString("utf-8"));
    logger.info("Decryption complete", { parsedKeys: Object.keys(parsed) });
    return parsed;
  } catch (err) {
    logger.error("decryptRequest failed", {
      err: err.message,
      stack: err.stack,
    });
    throw err;
  }
};

export const encryptResponse = (response, aesKey, iv) => {
  logger.info("encryptResponse called");

  try {
    const flippedIv = Buffer.alloc(iv.length);
    for (let i = 0; i < iv.length; i++) {
      flippedIv[i] = ~iv[i];
    }
    logger.info("IV flipped", { ivLength: flippedIv.length });

    const cipher = crypto.createCipheriv("aes-128-gcm", aesKey, flippedIv);
    const encryptedData = Buffer.concat([
      cipher.update(JSON.stringify(response), "utf-8"),
      cipher.final(),
      cipher.getAuthTag(),
    ]);
    logger.info("Response encrypted", {
      encryptedLength: encryptedData.length,
    });

    return encryptedData.toString("base64");
  } catch (err) {
    logger.error("encryptResponse failed", {
      err: err.message,
      stack: err.stack,
    });
    throw err;
  }
};
