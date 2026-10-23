"use client";
import { useState } from "react";
import {
  billingAmount,
  type BillingPeriod,
} from "@/lib/billing/billing-period";
import Link from "next/link";
import { PLAN_OPTIONS } from "@/lib/billing/plans";
import { FOUNDING_100 } from "@/lib/marketing/founding";
import { rememberPendingPlan } from "@/lib/billing/pending-plan";
import { primaryTrialCta, SITE_OFFER } from "@/lib/marketing/site-offer";
import { trackMarketingEvent } from "@/lib/marketing/track";
import { pricingHighlights } from "@/lib/marketing/pricing-guidance";

export function LandingPricing() {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  return (
    <section id="pricing" className="approved-pricing landing-shell">
      <div className="approved-pricing-intro">
        <div>
          <h2>Choose your plan.</h2>
          <p>
            <strong>Growth</strong> is our recommended plan for active agents.
          </p>
        </div>
        <div className="approved-billing">
          <div role="group" aria-label="Billing period">
            <button
              type="button"
              aria-pressed={period === "monthly"}
              onClick={() => setPeriod("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              aria-pressed={period === "yearly"}
              onClick={() => setPeriod("yearly")}
            >
              Yearly
            </button>
          </div>
          <small id="yearly-note">
            {period === "yearly"
              ? "Two months less than 12 monthly payments."
              : "Choose monthly or annual billing."}
          </small>
        </div>
      </div>
      <div className="approved-plan-grid">
        {PLAN_OPTIONS.filter((p) => !p.contactSales).map((plan) => (
          <article
            key={plan.id}
            className={`approved-plan ${plan.featured ? "approved-plan-featured" : ""}`}
          >
            {plan.featured && (
              <span className="approved-popular">Most popular</span>
            )}
            <header>
              <h3>{plan.name}</h3>
              <p>{plan.description}</p>
            </header>
            <div className="approved-price">
              {SITE_OFFER.founding.active && (
                <del>
                  $
                  {FOUNDING_100.listPrices[
                    plan.id as keyof typeof FOUNDING_100.listPrices
                  ] * (period === "yearly" ? 10 : 1)}
                </del>
              )}
              <strong>${billingAmount(plan.id, period)}</strong>
              <span>/{period === "yearly" ? "yr" : "mo"}</span>
            </div>
            {SITE_OFFER.founding.active && (
              <p className="approved-founding">Founding-member price</p>
            )}
            <p className="approved-billing-note">
              {period === "yearly"
                ? `$${billingAmount(plan.id, period)}/year billed annually · $${(billingAmount(plan.id, period) / 12).toFixed(2)}/mo equivalent`
                : `$${plan.price}/mo billed monthly`}
            </p>
            <ul>
              {pricingHighlights(plan.id).map((feature) => (
                <li key={feature}>
                  <span aria-hidden="true">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href={`/sign-up?plan=${plan.id}&billing=${period}`}
              onClick={() => {
                rememberPendingPlan(plan.id, period);
                trackMarketingEvent("pricing_plan_select", {
                  location: "landing-pricing",
                  plan: plan.id,
                });
                trackMarketingEvent("start_trial_click", {
                  location: "pricing",
                  plan: plan.id,
                });
              }}
              className="approved-plan-cta"
            >
              {primaryTrialCta()} <span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
