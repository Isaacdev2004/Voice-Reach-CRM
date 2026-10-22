import { verifiedUsageCount } from "../lib/billing/usage-count";
import assert from "node:assert/strict";
import { evaluateCheckoutClaim } from "../lib/billing/evaluate-checkout-claim";
import { billingForSettingsWrite, checkoutIsEligible, subscriptionStatus } from "../lib/billing/verification";
import { assertAttachmentOwnership } from "../lib/campaigns/attachment-ownership";
import { buildAnalyticsSnapshot } from "../lib/analytics/compute";

const claim = { sessionStatus: "complete", paymentStatus: "paid", planId: "pro", boundOwnerId: null,
  claimedOwnerId: null, requestingOwnerId: "user_a", checkoutEmail: "a@example.com", clerkEmail: null };
assert.equal(evaluateCheckoutClaim(claim).ok, false, "unbound claims require verified identity");
assert.equal(evaluateCheckoutClaim({ ...claim, clerkEmail: "a@example.com" }).ok, true);
assert.equal(evaluateCheckoutClaim({ ...claim, boundOwnerId: "user_b" }).ok, false);
assert.equal(evaluateCheckoutClaim({ ...claim, boundOwnerId: "user_a" }).ok, true);
assert.equal(billingForSettingsWrite(undefined, 0).subscriptionStatus, "none");
const saved = billingForSettingsWrite(undefined, 7);
assert.deepEqual(billingForSettingsWrite(saved, 0), { ...saved, voiceMinutesUsed: 0 });
for (const status of ["paused", "past_due", "unpaid", "incomplete", "incomplete_expired", "canceled", undefined]) {
  assert.equal(subscriptionStatus(status), "canceled");
}
assert.equal(subscriptionStatus("trialing"), "trialing");
assert.equal(subscriptionStatus("active"), "active");
const session = { status: "complete", payment_status: "paid", mode: "subscription", subscription: { status: "active" } };
assert.equal(checkoutIsEligible(session), true);
assert.equal(checkoutIsEligible({ ...session, payment_status: "unpaid" }), false);
assert.equal(checkoutIsEligible({ ...session, mode: "setup" }), false);
assert.equal(checkoutIsEligible({ ...session, subscription: null }), false);
assert.equal(checkoutIsEligible({ ...session, subscription: { status: "canceled" } }), false);
assert.equal(checkoutIsEligible({ ...session, payment_status: "no_payment_required", subscription: { status: "trialing" } }), true);
assertAttachmentOwnership("user_a", "user_a/attachments/file.pdf");
for (const path of ["user_b/attachments/file.pdf", "user_ab/attachments/file.pdf", "user_a/attachments/../secret", "user_a/attachments/%2e%2e", "user_a/attachments/", "user_a/other/file"]) {
  assert.throws(() => assertAttachmentOwnership("user_a", path));
}
const empty = buildAnalyticsSnapshot({ range: "30d", contacts: [], campaigns: [], recipients: [] });
assert.equal(empty.totals.outreach, 0);
assert.deepEqual(empty.providers, []);
assert.deepEqual(empty.campaigns, []);
assert.deepEqual(empty.channels, []);
assert.equal(empty.kpis.find((k) => k.id === "response")?.value, "Unavailable");
const now = new Date(Date.now() - 1000).toISOString();
const snapshot = buildAnalyticsSnapshot({ range: "7d", contacts: [],
  campaigns: [{ id: "c", name: "Test", provider: "twilio", status: "active", created_at: now }],
  recipients: [
    { id: "new", campaign_id: "c", delivery_status: "delivered", created_at: now, updated_at: now },
    { id: "old", campaign_id: "c", delivery_status: "delivered", created_at: "2020-01-01", updated_at: "2020-01-01" },
  ] });
assert.equal(snapshot.totals.outreach, 1);
assert.equal(snapshot.providers[0].count, 1);
assert.equal(snapshot.campaigns[0].volume, 1);
assert.equal(snapshot.campaigns[0].roi, "Unavailable");
assert.equal(snapshot.funnel.find((f) => f.id === "engagement")?.count, 0);


assert.equal(verifiedUsageCount(0, null), 0);
assert.equal(verifiedUsageCount(50, null), 50);
assert.throws(() => verifiedUsageCount(null, null));
assert.throws(() => verifiedUsageCount(0, { message: "database unavailable" }));

console.log("verify-regressions: ok");
