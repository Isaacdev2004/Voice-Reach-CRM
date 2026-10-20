/**
 * Unit checks for audit Phase 2–3 (no DB/network). Run: npm run test:unit
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { evaluateCheckoutClaim } from "../lib/billing/evaluate-checkout-claim";
import { phoneLast10IlikePattern } from "../lib/contacts/phone-match";
import { isInboundSmsForConfiguredNumber } from "../lib/webhooks/twilio-inbound-scope";
import { validateTwilioSignature } from "../lib/webhooks/twilio-signature";

function testTwilioSignature() {
  const token = "test_auth_token";
  const url = "https://example.com/api/webhooks/twilio/sms";
  const params = { Body: "STOP", From: "+15551234567", MessageSid: "SM123" };
  const sig = crypto
    .createHmac("sha1", token)
    .update(url + "BodySTOPFrom+15551234567MessageSidSM123", "utf8")
    .digest("base64");
  assert.equal(validateTwilioSignature(token, sig, url, params), true);
  assert.equal(validateTwilioSignature(token, "bad", url, params), false);
}

function testCheckoutClaim() {
  const ok = evaluateCheckoutClaim({
    sessionStatus: "complete",
    paymentStatus: "paid",
    planId: "starter",
    boundOwnerId: null,
    claimedOwnerId: null,
    requestingOwnerId: "user_a",
    checkoutEmail: "a@example.com",
    clerkEmail: "a@example.com",
  });
  assert.equal(ok.ok, true);

  const hijack = evaluateCheckoutClaim({
    sessionStatus: "complete",
    paymentStatus: "paid",
    planId: "starter",
    boundOwnerId: "user_b",
    claimedOwnerId: null,
    requestingOwnerId: "user_a",
    checkoutEmail: null,
    clerkEmail: null,
  });
  assert.equal(hijack.ok, false);
  if (!hijack.ok) assert.equal(hijack.code, "session_owner_mismatch");

  const email = evaluateCheckoutClaim({
    sessionStatus: "complete",
    paymentStatus: "paid",
    planId: "starter",
    boundOwnerId: null,
    claimedOwnerId: null,
    requestingOwnerId: "user_a",
    checkoutEmail: "paid@example.com",
    clerkEmail: "other@example.com",
  });
  assert.equal(email.ok, false);
  if (!email.ok) assert.equal(email.code, "email_mismatch");
}

function testPhoneAndInbound() {
  assert.equal(phoneLast10IlikePattern("+1 (555) 123-4567"), "%5551234567");
  process.env.TWILIO_FROM_NUMBER = "+15559876543";
  assert.equal(isInboundSmsForConfiguredNumber("+15559876543"), true);
  assert.equal(isInboundSmsForConfiguredNumber("+15551111111"), false);
  delete process.env.TWILIO_FROM_NUMBER;
}

testTwilioSignature();
testCheckoutClaim();
testPhoneAndInbound();
console.log("verify-unit: ok");
