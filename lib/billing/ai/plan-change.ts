import { getStripe } from "@/lib/stripe/config";
import { mappedAiCustomer } from "./entitlements";
import { requireAiBilling, verifyAiPrice } from "./stripe";
import { choiceFromPrice, monthlyChoice, type MonthlyChoice } from "./choices";
import { launchEligibility } from "./launch";
import { AssistantFailure, put, entries, digest } from "@/lib/assistant/store";
function policy() {
  const value = process.env.MYARI_AI_PLAN_CHANGE_PRORATION;
  if (!["none", "create_prorations", "always_invoice"].includes(value ?? ""))
    throw new AssistantFailure(
      "An approved plan-change proration policy is required",
      503,
    );
  return value as "none" | "create_prorations" | "always_invoice";
}
async function current(owner: string) {
  const stripe = getStripe(),
    customerId = await mappedAiCustomer(owner);
  if (!customerId)
    throw new AssistantFailure(
      "A verified existing subscription is required",
      409,
    );
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted || customer.metadata.ownerId !== owner)
    throw new AssistantFailure("Billing ownership could not be verified", 403);
  const list = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 100,
  });
  const active = list.data.filter(
    (s) => !["canceled", "incomplete_expired"].includes(s.status),
  );
  if (list.has_more || active.length !== 1)
    throw new AssistantFailure(
      "A single existing subscription is required; no duplicate checkout will be created",
      409,
    );
  const s = active[0];
  if (
    s.metadata.ownerId !== owner ||
    !["active", "trialing"].includes(s.status) ||
    s.cancel_at_period_end ||
    s.pending_update ||
    s.schedule ||
    s.items.has_more ||
    s.items.data.length !== 1
  )
    throw new AssistantFailure(
      "Review subscription ownership, payment, schedule, extra items or pending cancellation first",
      409,
    );
  const item = s.items.data[0],
    mapping = choiceFromPrice(item.price);
  if (!mapping || item.quantity !== 1)
    throw new AssistantFailure(
      "This annual, custom or grandfathered price requires an individually reviewed migration; no changes were made",
      409,
    );
  if (!item.current_period_start || !item.current_period_end)
    throw new AssistantFailure("Billing period could not be verified", 409);
  const applied = (await entries(owner, "plan_change_outcome", undefined, 100))
    .filter(
      (e) => e.metadata.subscriptionId === s.id && e.metadata.applied === true,
    )
    .map((e) => e.id)
    .sort();
  return { customerId, s, item, mapping, revision: digest(applied) };
}
function fingerprint(c: Awaited<ReturnType<typeof current>>) {
  return digest({
    revision: c.revision,
    subscriptionId: c.s.id,
    item: c.item.id,
    price: c.item.price.id,
    quantity: c.item.quantity,
    status: c.s.status,
    start: c.item.current_period_start,
    end: c.item.current_period_end,
    trialEnd: c.s.trial_end,
    discounts: c.s.discounts,
  });
}
export async function previewPlanChange(owner: string, target: MonthlyChoice) {
  await requireAiBilling();
  if (process.env.MYARI_AI_PLAN_CHANGES_ENABLED !== "true")
    throw new AssistantFailure(
      "Monthly plan changes are staged and unavailable",
      503,
    );
  const c = await current(owner);
  if (c.mapping.choice === target)
    throw new AssistantFailure(
      "This subscription already has the selected pricing choice",
      409,
    );
  const next = monthlyChoice(c.mapping.planId, target);
  if (target === "ai") {
    const eligibility = launchEligibility(owner, false);
    if (
      !eligibility.eligible ||
      !eligibility.config?.eligiblePlans.includes(next.planId)
    )
      throw new AssistantFailure(
        eligibility.reason ?? "This plan is outside the approved launch cohort",
        403,
      );
  }
  await verifyAiPrice(next.priceId, next.monthly);
  const proration = policy(),
    at = Math.floor(Date.now() / 1000);
  const invoice = await getStripe().invoices.createPreview({
    customer: c.customerId,
    subscription: c.s.id,
    subscription_details: {
      items: [{ id: c.item.id, price: next.priceId, quantity: 1 }],
      proration_behavior: proration,
      proration_date: at,
    },
  });
  if (invoice.currency !== "usd")
    throw new AssistantFailure(
      "Invoice currency does not match this monthly offer",
      409,
    );
  const id = crypto.randomUUID(),
    snapshot = {
      subscriptionId: c.s.id,
      customerId: c.customerId,
      itemId: c.item.id,
      fingerprint: fingerprint(c),
      from: c.mapping,
      to: next,
      policy: proration,
      prorationDate: at,
      currency: invoice.currency,
      amountDue: invoice.amount_due,
      currentPeriodEnd: new Date(
        c.item.current_period_end * 1000,
      ).toISOString(),
      effectiveAt: new Date(at * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60000).toISOString(),
    };
  const hash = digest(snapshot);
  await put(owner, "plan_change_quote", id, "preview", {
    ...snapshot,
    digest: hash,
  });
  return {
    quoteId: id,
    digest: hash,
    ...snapshot,
    monthlyDifference: next.monthly - c.mapping.monthly,
    notice:
      "Replaces the existing base price on the same subscription. No add-on, additional subscription or new trial. Existing founding terms remain unchanged unless you explicitly approve this change; prior promotional eligibility is not guaranteed after switching back. Tax/discounts and proration are shown by Stripe. AI access changes only after authoritative payment/subscription confirmation.",
  };
}
export async function approvePlanChange(
  owner: string,
  quoteId: string,
  hash: string,
) {
  await requireAiBilling();
  if (process.env.MYARI_AI_PLAN_CHANGES_ENABLED !== "true")
    throw new AssistantFailure("Monthly plan changes are disabled", 503);
  const quote = (await entries(owner, "plan_change_quote", quoteId, 1))[0]
    ?.metadata;
  if (
    !quote ||
    quote.digest !== hash ||
    Date.parse(String(quote.expiresAt)) < Date.now()
  )
    throw new AssistantFailure(
      "Plan-change quote expired or changed. Preview again.",
      409,
    );
  const c = await current(owner);
  if (fingerprint(c) !== quote.fingerprint || c.s.id !== quote.subscriptionId)
    throw new AssistantFailure("Subscription changed. Preview again.", 409);
  const to = quote.to as ReturnType<typeof monthlyChoice>,
    expected = monthlyChoice(c.mapping.planId, to.choice);
  if (digest(to) !== digest(expected) || policy() !== quote.policy)
    throw new AssistantFailure(
      "Plan configuration changed. Preview again.",
      409,
    );
  if (to.choice === "ai") {
    const eligible = launchEligibility(owner, false);
    if (
      !eligible.eligible ||
      !eligible.config?.eligiblePlans.includes(to.planId)
    )
      throw new AssistantFailure(
        "Launch eligibility changed. Preview again.",
        409,
      );
  }
  await verifyAiPrice(to.priceId, to.monthly);
  const claim = digest({ subscription: c.s.id, source: quote.fingerprint });
  if (
    !(await put(owner, "plan_change_claim", claim, "once", {
      quoteId,
      state: "requested",
    }))
  )
    throw new AssistantFailure(
      "A change for this subscription version was already requested. Refresh Billing before retrying.",
      409,
    );
  const updated = await getStripe().subscriptions.update(
    c.s.id,
    {
      items: [{ id: c.item.id, price: to.priceId, quantity: 1 }],
      payment_behavior: "pending_if_incomplete",
      proration_behavior: quote.policy as ReturnType<typeof policy>,
      proration_date: Number(quote.prorationDate),
    },
    { idempotencyKey: `ai-plan-${owner}-${claim}` },
  );
  await put(owner, "plan_change_outcome", quoteId, "result", {
    subscriptionId: updated.id,
    status: updated.status,
    pending: !!updated.pending_update,
    applied:
      !updated.pending_update &&
      updated.items.data.length === 1 &&
      updated.items.data[0].price.id === to.priceId,
    at: new Date().toISOString(),
  });
  return {
    subscriptionId: updated.id,
    status: updated.status,
    pending: !!updated.pending_update,
    notice:
      "Stripe acknowledged the replacement request. Refresh Billing to verify payment and effective entitlements. No second subscription or add-on was created.",
  };
}
