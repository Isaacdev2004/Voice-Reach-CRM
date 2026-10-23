"use client";

import {
  billingAmount,
  normalizeBillingPeriod,
} from "@/lib/billing/billing-period";
import {
  CHECKOUT_PLAN_OPTIONS,
  planById,
  type PlanId,
} from "@/lib/billing/plans";
import { rememberPendingPlan } from "@/lib/billing/pending-plan";
import { cn } from "@/lib/cn";
import { FOUNDING_100 } from "@/lib/marketing/founding";
import { trackMarketingEvent } from "@/lib/marketing/track";
import { SITE_OFFER } from "@/lib/marketing/site-offer";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function CheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get("plan");
  const billingPeriod = normalizeBillingPeriod(searchParams.get("billing"));

  const [planId, setPlanId] = useState<PlanId>(
    initial && planById(initial) ? (initial as PlanId) : "growth",
  );

  useEffect(() => {
    if (initial && planById(initial)) setPlanId(initial as PlanId);
  }, [initial]);

  const selected = planById(planId)!;

  const continueToSignUp = () => {
    rememberPendingPlan(planId, billingPeriod);
    trackMarketingEvent("start_trial_click", {
      planId,
      location: "checkout-page",
    });
    router.push(`/sign-up?plan=${planId}&billing=${billingPeriod}`);
  };

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
        Step 1 of 2 · Start free trial
      </p>
      <h1 className="mt-2 font-serif text-[36px] font-semibold text-ink">
        Choose your plan
      </h1>
      <p className="mt-2 text-[15px] text-slate-text">
        {SITE_OFFER.trialDays}-day free trial —{" "}
        <strong className="font-semibold text-ink">no credit card</strong> until
        the trial ends. Create your account next.{" "}
        {SITE_OFFER.whiteGlove.shortLine}. Not ready?{" "}
        <Link
          href={SITE_OFFER.playbook.path}
          className="font-medium text-rose-gold-deep hover:underline"
        >
          Get the free playbook
        </Link>
        .
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {CHECKOUT_PLAN_OPTIONS.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => setPlanId(plan.id)}
            className={cn(
              "rounded-2xl border p-5 text-left transition-all",
              planId === plan.id
                ? "border-rose-gold-deep bg-rose-gold/10 ring-2 ring-rose-gold/30"
                : "border-outline-variant/20 bg-ivory hover:border-rose-gold/40",
            )}
          >
            <p className="font-serif text-[20px] font-semibold text-ink">
              {plan.name}
            </p>
            <p className="mt-1 font-serif text-[28px] text-ink">
              ${billingAmount(plan.id, billingPeriod)}
              <span className="text-[14px] font-normal text-taupe">
                /{billingPeriod === "yearly" ? "yr" : "mo"} after trial
              </span>
            </p>
            <p className="mt-2 text-[12px] text-taupe">{plan.description}</p>
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-outline-variant/15 bg-champagne/40 p-6">
        <p className="font-medium text-ink">
          {selected.name} — ${billingAmount(selected.id, billingPeriod)}/
          {billingPeriod === "yearly" ? "year" : "month"} after your{" "}
          {SITE_OFFER.trialDays}-day trial
        </p>
        <p className="mt-2 text-[14px] text-slate-text">
          We&apos;ll ask for a payment method when your trial ends (or anytime
          from Settings → Billing).
        </p>
        <ul className="mt-3 space-y-1 text-[13px] text-slate-text">
          {selected.features.slice(0, 6).map((f) => (
            <li key={f}>· {f}</li>
          ))}
        </ul>

        <button
          type="button"
          onClick={continueToSignUp}
          className="mt-5 w-full rounded-full bg-rose-gold px-6 py-3.5 text-[15px] font-medium text-ivory"
        >
          Continue — create your account
        </button>
        <p className="mt-3 text-center text-[12px] text-taupe">
          No card required now · No charge until trial ends
        </p>
        <p className="mt-2 text-center text-[12px] text-taupe">
          Trial includes {FOUNDING_100.trialUsageCaps.sms} SMS,{" "}
          {FOUNDING_100.trialUsageCaps.rvm} voicemails, and{" "}
          {FOUNDING_100.trialUsageCaps.email} emails to test safely.
        </p>
      </div>

      <p className="mt-8 text-center text-[13px] text-taupe">
        <Link
          href="/sign-in"
          className="font-medium text-rose-gold-deep hover:underline"
        >
          Sign in
        </Link>
        {" · "}
        <Link href="/" className="hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-taupe">
          Loading…
        </div>
      }
    >
      <CheckoutInner />
    </Suspense>
  );
}
