import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { loadStripeCustomerId } from "@/lib/billing/settings-store";
import { appBaseUrl, getStripe, isStripeConfigured } from "@/lib/stripe/config";
import { stripeMessage } from "@/lib/billing/stripe-checkout";

/**
 * Stripe Customer Portal — update payment method, view invoices, cancel subscription.
 * Configure portal in Stripe Dashboard → Settings → Billing → Customer portal.
 */
export const POST = withApiHandler(async () => {
  if (!isStripeConfigured()) {
    return apiError("Stripe is not configured.", { status: 503, code: "stripe_not_configured" });
  }

  const ownerId = await requireUserId();
  const customerId = await loadStripeCustomerId(ownerId);
  if (!customerId) {
    return apiError(
      "No Stripe customer on file yet. Complete a subscription payment first, then you can manage or cancel here.",
      { status: 400, code: "no_stripe_customer" },
    );
  }

  const stripe = getStripe();
  const base = appBaseUrl();

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${base}/dashboard/settings?tab=billing`,
    });
    if (!session.url) {
      return apiError("Stripe did not return a portal URL.", { status: 500 });
    }
    return apiOk({ url: session.url });
  } catch (err) {
    return apiError(stripeMessage(err), { status: 500, code: "stripe_portal_failed" });
  }
});
