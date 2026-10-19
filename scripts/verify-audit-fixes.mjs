/**
 * Lightweight checks for audit remediations (no DB / network).
 */
import crypto from "crypto";
import assert from "assert";

function validateTwilioSignature(authToken, signature, url, params) {
  const sortedKeys = Object.keys(params).sort();
  let payload = url;
  for (const key of sortedKeys) {
    payload += key + params[key];
  }
  const expected = crypto.createHmac("sha1", authToken).update(payload, "utf8").digest("base64");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

const token = "test_auth_token";
const url = "https://example.com/api/webhooks/twilio/sms";
const params = { Body: "STOP", From: "+15551234567", MessageSid: "SM123" };
const sig = crypto
  .createHmac("sha1", token)
  .update(url + "BodySTOPFrom+15551234567MessageSidSM123", "utf8")
  .digest("base64");

assert.strictEqual(validateTwilioSignature(token, sig, url, params), true);
assert.strictEqual(validateTwilioSignature(token, "bad", url, params), false);

console.log("verify-audit-fixes: ok");
