import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key(id: string): Buffer {
  try {
    const ring = JSON.parse(process.env.DOTLOOP_TOKEN_KEYRING ?? "{}");
    const encoded = ring[id];
    if (typeof encoded !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(encoded)) throw Error();
    const bytes = Buffer.from(encoded, "base64");
    if (bytes.length !== 32) throw Error();
    return bytes;
  } catch { throw new Error("DOTLOOP_ENCRYPTION_UNAVAILABLE"); }
}
export function dotloopEncryptionReady(): boolean {
  try { const id = activeKey(); key(id); return true; } catch { return false; }
}
function activeKey() {
  const id = process.env.DOTLOOP_TOKEN_ACTIVE_KEY_ID ?? "";
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) throw Error("DOTLOOP_ENCRYPTION_UNAVAILABLE");
  return id;
}
function aad(owner: string, kind: "access" | "refresh") {
  return Buffer.from(JSON.stringify(["myari", "dotloop", owner, kind, 1]));
}
export function encryptDotloopToken(owner: string, kind: "access" | "refresh", value: string): string {
  if (!owner || !value || value.length > 16384) throw Error("DOTLOOP_CREDENTIAL_INVALID");
  const id = activeKey(), iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(id), iv);
  cipher.setAAD(aad(owner, kind));
  const bytes = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", id, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), bytes.toString("base64url")].join(":");
}
export function decryptDotloopToken(owner: string, kind: "access" | "refresh", value: string): string {
  try {
    const parts = value.split(":");
    if (parts.length !== 5 || parts[0] !== "v1" || !/^[A-Za-z0-9_-]{1,40}$/.test(parts[1])) throw Error();
    const [, id, iv, tag, encrypted] = parts;
    if (Buffer.from(iv, "base64url").length !== 12 || Buffer.from(tag, "base64url").length !== 16) throw Error();
    const cipher = createDecipheriv("aes-256-gcm", key(id), Buffer.from(iv, "base64url"));
    cipher.setAAD(aad(owner, kind));
    cipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([cipher.update(Buffer.from(encrypted, "base64url")), cipher.final()]).toString("utf8");
  } catch { throw Error("DOTLOOP_CREDENTIAL_UNAVAILABLE"); }
}
