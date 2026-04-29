import crypto from "node:crypto";

export const getPrivateKey = () => {
  const privateKey = process.env.WHATSAPP_FLOW_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("PRIVATE_KEY is not set in environment variables");
  }

  return crypto.createPrivateKey({
    key: privateKey,
    format: "pem",
  });
};

export const decryptRequest = (body) => {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;

  // Decrypt the AES key using RSA private key
  const decryptedAesKey = crypto.privateDecrypt(
    {
      key: getPrivateKey(), // ✅ KeyObject instead of raw string
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(encrypted_aes_key, "base64"),
  );

  // Decrypt the flow data using AES-GCM
  const iv = Buffer.from(initial_vector, "base64");
  const encryptedFlowDataBuffer = Buffer.from(encrypted_flow_data, "base64");

  // ✅ Last 16 bytes are the GCM auth tag — must be separated
  const TAG_LENGTH = 16;
  const encryptedData = encryptedFlowDataBuffer.subarray(0, -TAG_LENGTH);
  const authTag = encryptedFlowDataBuffer.subarray(-TAG_LENGTH);

  const decipher = crypto.createDecipheriv("aes-128-gcm", decryptedAesKey, iv);
  decipher.setAuthTag(authTag); // ✅ must set auth tag for GCM

  const decryptedData = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  return JSON.parse(decryptedData.toString("utf-8"));
};

export const encryptResponse = (response, aesKey, iv) => {
  // Flip the IV for response encryption
  const flippedIv = Buffer.alloc(iv.length);
  for (let i = 0; i < iv.length; i++) {
    flippedIv[i] = ~iv[i];
  }

  const cipher = crypto.createCipheriv("aes-128-gcm", aesKey, flippedIv);
  const encryptedData = Buffer.concat([
    cipher.update(JSON.stringify(response), "utf-8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  return encryptedData.toString("base64");
};
