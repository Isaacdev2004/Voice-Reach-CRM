/**
 * Unit checks for audit Phase 2–3 (no DB/network). Run: npm run test:unit
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { evaluateCheckoutClaim } from "../lib/billing/evaluate-checkout-claim";
import { phoneLast10IlikePattern } from "../lib/contacts/phone-match";
import { isInboundSmsForConfiguredNumber } from "../lib/webhooks/twilio-inbound-scope";
import { validateTwilioSignature } from "../lib/webhooks/twilio-signature";
import {
  normalizeAiOutput,
  parseJsonFromLlm,
  outputToPlainText,
  stripMarkdownCodeFence,
} from "../lib/ai/parse-output";
import {
  normalizeOutboundContent,
  shouldBlockRawJsonSend,
} from "../lib/campaigns/outbound-content";

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

function testOutboundContent() {
  const raw = '```json\n{"subject":"Hi","body":"Hello"}\n```';
  const email = normalizeOutboundContent("email", raw, "Fallback");
  assert.equal(email.extractedFromJson, true);
  assert.equal(email.subject, "Hi");
  assert.equal(email.body, "Hello");
  assert.equal(shouldBlockRawJsonSend(email.body, email.subject), false);

  const bad = normalizeOutboundContent(
    "email",
    '{"recommendation":"Call them","reason":"x","suggestedChannel":"phone"}',
    "Title",
  );
  assert.equal(shouldBlockRawJsonSend(bad.body, bad.subject), true);

  const sms = normalizeOutboundContent("sms", '{"body":"Quick check-in"}', "");
  assert.equal(sms.body, "Quick check-in");
}

function testAiParseOutput() {
  const fenced = stripMarkdownCodeFence(
    '```json\n{"subject":"Hi","body":"Hello there"}\n```',
  );
  assert.equal(fenced.includes("subject"), true);
  const parsed = parseJsonFromLlm(
    '```json\n{"recommendation":"Call them","reason":"Trust","suggestedChannel":"phone"}\n```',
  );
  assert.ok(parsed);
  assert.equal(parsed!.recommendation, "Call them");

  const emailOk = normalizeAiOutput(
    "email_writer",
    { subject: "Let's Find Your Perfect Home", body: "Hi Alex,\n\nChecking in." },
    {},
  );
  assert.equal(emailOk.ok, true);
  if (emailOk.ok) {
    assert.equal(emailOk.output.subject, "Let's Find Your Perfect Home");
  }

  const emailWrong = normalizeAiOutput(
    "email_writer",
    {
      recommendation: "Schedule a showcase",
      reason: "Luxury",
      suggestedChannel: "phone",
    },
    {},
  );
  assert.equal(emailWrong.ok, false);

  const smsOk = normalizeAiOutput("sms_writer", { body: "Quick check-in?" }, {});
  assert.equal(smsOk.ok, true);

  const plain = outputToPlainText("email_writer", {
    subject: "Subj",
    body: "Body text",
  });
  assert.match(plain, /Subject: Subj/);
  assert.match(plain, /Body text/);
}

testTwilioSignature();
testCheckoutClaim();
testPhoneAndInbound();
testAiParseOutput();
testOutboundContent();
console.log("verify-unit: ok");
