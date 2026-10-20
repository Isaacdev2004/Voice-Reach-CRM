import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { loadStripeCustomerId } from "@/lib/billing/settings-store";
import { createPaymentMethodSetupSession, stripeMessage } from "@/lib/billing/stripe-checkout";
import { appBaseUrl, isStripeConfigured } from "@/lib/stripe/config";

/** Stripe Checkout (setup mode) — add a card before or after trial without a new subscription. */
export const POST = withApiHandler(async () => {
  if (!isStripeConfigured()) {
    return apiError("Stripe is not configured.", { status: 503, code: "stripe_not_configured" });
  }

  const ownerId = await requireUserId();
  const customerId = await loadStripeCustomerId(ownerId);
  if (!customerId) {
    return apiError(
      "Start your free trial first, then you can add a payment method here.",
      { status: 400, code: "no_stripe_customer" },
    );
  }

  const base = appBaseUrl();

  try {
    const session = await createPaymentMethodSetupSession({
      customerId,
      ownerId,
      successUrl: `${base}/dashboard/settings?tab=billing&payment_method=added`,
      cancelUrl: `${base}/dashboard/settings?tab=billing&payment_method=cancel`,
    });
    if (!session.url) {
      return apiError("Stripe did not return a checkout URL.", { status: 500 });
    }
    return apiOk({ url: session.url });
  } catch (err) {
    return apiError(stripeMessage(err), { status: 500, code: "stripe_setup_failed" });
  }
});
