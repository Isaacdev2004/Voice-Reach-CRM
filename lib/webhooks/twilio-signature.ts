import crypto from "crypto";

/** @see https://www.twilio.com/docs/usage/security#validating-requests */
export function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): boolean {
  if (!authToken || !signature) return false;

  const sortedKeys = Object.keys(params).sort();
  let payload = url;
  for (const key of sortedKeys) {
    payload += key + params[key];
  }

  const expected = crypto.createHmac("sha1", authToken).update(payload, "utf8").digest("base64");

  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function twilioWebhookPublicUrl(request: Request): string {
  const configured = process.env.APP_BASE_URL?.replace(/\/$/, "");
  if (configured) {
    const path = new URL(request.url).pathname;
    const search = new URL(request.url).search;
    return `${configured}${path}${search}`;
  }
  return request.url;
}
