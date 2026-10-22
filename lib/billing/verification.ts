import type { BillingSettings } from "@/lib/settings/types";

export function subscriptionStatus(status: string | null | undefined): "active" | "trialing" | "canceled" {
  return status === "active" || status === "trialing" ? status : "canceled";
}

export function checkoutIsEligible(session: {
  status: string | null;
  payment_status: string;
  mode: string;
  subscription: { status: string } | string | null;
}): boolean {
  return session.status === "complete" && session.mode === "subscription" &&
    ["paid", "no_payment_required"].includes(session.payment_status) &&
    typeof session.subscription === "object" && session.subscription !== null &&
    ["active", "trialing"].includes(session.subscription.status);
}

/** Settings clients cannot grant themselves billing entitlements. */
export function billingForSettingsWrite(saved: BillingSettings | undefined, minutes: number): BillingSettings {
  return { ...(saved ?? {
    planId: "starter", planName: "Choose a plan", monthlyPrice: 0,
    voiceMinutesLimit: 0, voiceMinutesUsed: 0, subscriptionStatus: "none",
  }), voiceMinutesUsed: minutes };
}
