import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
function key() {
  const value = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!value || Buffer.from(value, "base64").length !== 32)
    throw Error("Calendar token encryption needs configuration.");
  return Buffer.from(value, "base64");
}
export function tokenEncryptionConfigured() {
  try {
    key();
    return true;
  } catch {
    return false;
  }
}
export function encryptCalendarToken(value: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    "enc1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    data.toString("base64url"),
  ].join(".");
}
export function decryptCalendarToken(value: string) {
  if (!value.startsWith("enc1.")) return value;
  const [, iv, tag, data] = value.split(".");
  try {
    const cipher = createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(iv, "base64url"),
    );
    cipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      cipher.update(Buffer.from(data, "base64url")),
      cipher.final(),
    ]).toString("utf8");
  } catch {
    throw Error("Calendar connection needs secure reauthorization.");
  }
}
