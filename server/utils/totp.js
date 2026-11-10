import crypto from "crypto";

// RFC 6238 time based one time passwords (SHA-1, 30 second step, 6 digits).
// Implemented with Node's crypto module so no extra dependency is required.

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export const base32Encode = (buffer) => {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
};

export const base32Decode = (text) => {
  const clean = String(text).toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error("Invalid base32 secret");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
};

export const generateSecret = () => base32Encode(crypto.randomBytes(20));

export const hotp = (secretBase32, counter, digits = 6) => {
  const key = base32Decode(secretBase32);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(message).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(binary % 10 ** digits).padStart(digits, "0");
};

export const totp = (secretBase32, { timeMs = Date.now(), stepSeconds = 30, digits = 6 } = {}) =>
  hotp(secretBase32, Math.floor(timeMs / 1000 / stepSeconds), digits);

// Accepts the current code and one step either side to tolerate small clock drift.
export const verifyTotp = (secretBase32, code, { timeMs = Date.now(), window = 1 } = {}) => {
  const candidate = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(candidate)) return false;
  const counter = Math.floor(timeMs / 1000 / 30);
  for (let drift = -window; drift <= window; drift += 1) {
    const expected = hotp(secretBase32, counter + drift);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(candidate))) return true;
  }
  return false;
};

export const buildOtpAuthUrl = ({ secret, accountName, issuer }) =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}` +
  `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

// Recovery codes look like "a1b2c-3d4e5". Only their SHA-256 hashes are stored.
export const generateRecoveryCodes = (count = 10) =>
  Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(5).toString("hex");
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });

export const hashRecoveryCode = (code) =>
  crypto.createHash("sha256").update(String(code).trim().toLowerCase()).digest("hex");
