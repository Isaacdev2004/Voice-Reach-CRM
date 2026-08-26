import { writeAuditLog } from "@/lib/audit";
import { loadStripeCustomerId, saveStripeCustomerId } from "@/lib/billing/settings-store";
import { PAYG_RATES } from "@/lib/billing/plans";
import { resolveOwnerPlan } from "@/lib/billing/plan-limits";
import { getStripe, isStripeConfigured } from "@/lib/stripe/config";

type PaygChannel = "sms" | "voicemail";

/**
 * Charge Starter (and any plan with 0 included allotment) usage onto the
 * customer's next Stripe subscription invoice via pending invoice items.
 * Growth/Pro included sends are not billed here — they use the monthly allotment.
 */
export async function billPaygUsage(params: {
  ownerId: string;
  channel: PaygChannel;
  quantity?: number;
  /** Prevents double-billing on retries */
  idempotencyKey: string;
  metadata?: Record<string, string>;
  /** Skip charge for mock/simulation sends */
  simulated?: boolean;
}): Promise<{ billed: boolean; amountCents?: number; reason?: string }> {
  if (params.simulated) {
    return { billed: false, reason: "simulated" };
  }
  if (!isStripeConfigured()) {
    return { billed: false, reason: "stripe_not_configured" };
  }

  const quantity = Math.max(1, params.quantity ?? 1);
  const plan = await resolveOwnerPlan(params.ownerId);

  if (params.channel === "sms" && plan.smsIncluded > 0) {
    return { billed: false, reason: "included_in_plan" };
  }
  if (params.channel === "voicemail" && plan.rvmIncluded > 0) {
    return { billed: false, reason: "included_in_plan" };
  }

  let customerId = await loadStripeCustomerId(params.ownerId);
  if (!customerId) {
    return { billed: false, reason: "no_stripe_customer" };
  }

  const unitCents =
    params.channel === "sms"
      ? Math.round(PAYG_RATES.sms * 100)
      : Math.round(PAYG_RATES.rvm * 100);
  const amountCents = unitCents * quantity;
  const label =
    params.channel === "sms"
      ? `ARI SMS · $${PAYG_RATES.sms.toFixed(2)} each × ${quantity}`
      : `ARI ringless voicemail · $${PAYG_RATES.rvm.toFixed(2)} each × ${quantity}`;

  try {
    const stripe = getStripe();
    await stripe.invoiceItems.create(
      {
        customer: customerId,
        currency: "usd",
        amount: amountCents,
        description: label,
        metadata: {
          ownerId: params.ownerId,
          channel: params.channel,
          quantity: String(quantity),
          unitCents: String(unitCents),
          ...params.metadata,
        },
      },
      { idempotencyKey: params.idempotencyKey.slice(0, 255) },
    );

    await writeAuditLog({
      ownerId: params.ownerId,
      action: "PAYG_USAGE_BILLED",
      entityType: "billing",
      metadata: {
        channel: params.channel,
        quantity,
        amountCents,
        customerId,
        idempotencyKey: params.idempotencyKey,
      },
    }).catch(() => undefined);

    return { billed: true, amountCents };
  } catch (err) {
    const message = err instanceof Error ? err.message : "payg_bill_failed";
    // Idempotent replay is success
    if (/idempotent/i.test(message)) {
      return { billed: true, amountCents };
    }
    console.error("[payg]", message, err);
    await writeAuditLog({
      ownerId: params.ownerId,
      action: "PAYG_USAGE_BILL_FAILED",
      entityType: "billing",
      metadata: {
        channel: params.channel,
        quantity,
        error: message,
        idempotencyKey: params.idempotencyKey,
      },
    }).catch(() => undefined);
    return { billed: false, reason: message };
  }
}

/** Persist Stripe customer from a Checkout Session onto the owner. */
export async function linkStripeCustomerFromSession(
  ownerId: string,
  customerId: string | null | undefined,
) {
  if (!customerId || typeof customerId !== "string") return;
  await saveStripeCustomerId(ownerId, customerId);
}
