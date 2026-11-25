import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
type Envelope = {
  version: 1;
  keyId: string;
  iv: string;
  tag: string;
  ciphertext: string;
};
export function sealCredential(
  secret: string,
  context: { owner: string; accountSid: string },
  keyId: string,
  key: Buffer,
): Envelope {
  if (
    key.length !== 32 ||
    !secret ||
    !context.owner ||
    !/^AC[0-9a-f]{32}$/i.test(context.accountSid) ||
    !keyId
  )
    throw Error("Invalid credential configuration");
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(
    Buffer.from(JSON.stringify([context.owner, context.accountSid, keyId])),
  );
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  return {
    version: 1,
    keyId,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}
export function openCredential(
  e: Envelope,
  context: { owner: string; accountSid: string },
  keyring: ReadonlyMap<string, Buffer>,
): string {
  const key = keyring.get(e.keyId);
  if (e.version !== 1 || !key || key.length !== 32)
    throw Error("Credential key unavailable");
  try {
    const iv = Buffer.from(e.iv, "base64"),
      tag = Buffer.from(e.tag, "base64");
    if (iv.length !== 12 || tag.length !== 16) throw Error();
    const cipher = createDecipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(
      Buffer.from(JSON.stringify([context.owner, context.accountSid, e.keyId])),
    );
    cipher.setAuthTag(tag);
    return Buffer.concat([
      cipher.update(Buffer.from(e.ciphertext, "base64")),
      cipher.final(),
    ]).toString("utf8");
  } catch {
    throw Error("Credential verification failed");
  }
}
