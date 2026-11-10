import crypto from "crypto";

// Encrypts small secrets (such as 2FA seeds) at rest with AES-256-GCM.
// The key comes from TWO_FACTOR_ENCRYPTION_KEY; any string is accepted and hashed to 32 bytes.

export const isSecretBoxConfigured = () => Boolean(process.env.TWO_FACTOR_ENCRYPTION_KEY);

const getKey = () => {
  if (!isSecretBoxConfigured()) throw new Error("TWO_FACTOR_ENCRYPTION_KEY is not configured");
  return crypto.createHash("sha256").update(process.env.TWO_FACTOR_ENCRYPTION_KEY).digest();
};

export const encryptSecret = (plain) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64")).join(".");
};

export const decryptSecret = (payload) => {
  const [iv, tag, encrypted] = String(payload).split(".").map((part) => Buffer.from(part, "base64"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
};
