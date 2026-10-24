"use client";
import { useEffect, useState } from "react";
import { AI_LAUNCH_PLANS, AI_LIMITS } from "@/lib/billing/ai/catalog";
export function AiNewSubscriptionReview() {
  const [planId, setPlanId] = useState(""),
    [accepted, setAccepted] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [requestId] = useState(() => crypto.randomUUID());
  useEffect(() => {
    setPlanId(new URLSearchParams(window.location.search).get("aiPlan") ?? "");
  }, []);
  const plan = AI_LAUNCH_PLANS.find((p) => p.id === planId);
  if (!plan) return null;
  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/billing/ai/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: plan!.id,
            requestId,
            confirmation: "CONFIRM_NEW_AI_SUBSCRIPTION",
          }),
        }),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      const url = new URL(d.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com")
        throw Error("Checkout destination could not be verified");
      window.location.assign(url.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="reviews-referrals">
      <h3 className="font-serif text-xl">Review {plan.name}</h3>
      <p>
        ${plan.monthly}/month, including AI Plus and the corresponding CRM tier.
        AI Plus includes {AI_LIMITS.plus.requests} requests and{" "}
        {AI_LIMITS.plus.campaign_drafts} new campaign drafts per billing period.
      </p>
      <p>
        For eligible new subscribers only. Existing subscriptions and founding
        pricing are preserved; this flow does not migrate or replace them.
        Checkout verifies the approved launch window, exact Stripe price, trial
        terms and duplicate-subscription safeguards.
      </p>
      <label>
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        I approve proceeding to the displayed new-subscription Stripe checkout.
      </label>
      <button disabled={busy || !accepted} onClick={() => void checkout()}>
        Continue to Stripe review
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
