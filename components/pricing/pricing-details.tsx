"use client";
import { useState } from "react";
import Link from "next/link";
import { FOUNDING_100 } from "@/lib/marketing/founding";
import { PLAN_OPTIONS, PAYG_RATES } from "@/lib/billing/plans";
import { PLAN_ENTITLEMENTS } from "@/lib/billing/plan-entitlements";
import { SITE_OFFER } from "@/lib/marketing/site-offer";
import { recommendPlan } from "@/lib/marketing/pricing-guidance";

export function PricingDetails() {
  const [contacts, setContacts] = useState("1000"),
    [users, setUsers] = useState("1"),
    [sms, setSms] = useState("0");
  const [result, setResult] = useState<ReturnType<typeof recommendPlan>>(null);
  const [error, setError] = useState("");
  return (
    <section className="approved-pricing-details landing-shell">
      <details className="approved-chooser">
        <summary>
          Help me choose <span aria-hidden="true">＋</span>
        </summary>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const next = recommendPlan(
              Number(contacts),
              Number(users),
              Number(sms),
            );
            setResult(next);
            setError(
              next
                ? ""
                : "Enter valid, non-negative contact and SMS counts, and at least one user.",
            );
          }}
        >
          <p>
            Find a starting point based on your actual needs. You can review
            every allowance below.
          </p>
          <div className="approved-chooser-fields">
            <label>
              Approximate contacts
              <input
                type="number"
                min="0"
                max="10000000"
                required
                value={contacts}
                onChange={(e) => {
                  setContacts(e.target.value);
                  setResult(null);
                }}
              />
            </label>
            <label>
              People using MyARI
              <input
                type="number"
                min="1"
                max="10000"
                required
                value={users}
                onChange={(e) => {
                  setUsers(e.target.value);
                  setResult(null);
                }}
              />
            </label>
            <label>
              Expected SMS per month
              <input
                type="number"
                min="0"
                max="10000000"
                required
                value={sms}
                onChange={(e) => {
                  setSms(e.target.value);
                  setResult(null);
                }}
              />
            </label>
          </div>
          <button className="public-outline-button" type="submit">
            Find my fit
          </button>
          {error && <p role="alert">{error}</p>}
          {result && (
            <div role="status" className="approved-recommendation">
              <h3>{result.plan.name} may be your best fit</h3>
              <p>{result.explanation}</p>
              <Link
                onClick={() => {
                  if (!result.plan.contactSales) {
                    const comparison =
                      document.getElementById("plan-comparison");
                    if (comparison instanceof HTMLDetailsElement)
                      comparison.open = true;
                  }
                }}
                href={
                  result.plan.contactSales ? "/contact" : `#plan-comparison`
                }
              >
                {result.plan.contactSales
                  ? "Discuss Team"
                  : "Compare plan details"}{" "}
                →
              </Link>
            </div>
          )}
        </form>
      </details>
      <details id="plan-comparison" className="approved-comparison">
        <summary>
          <span>
            <h2>Find the right fit for your business.</h2>
            <p>Compare verified limits, capabilities and support.</p>
          </span>
          <span aria-hidden="true">＋</span>
        </summary>
        <div className="approved-comparison-grid">
          {PLAN_OPTIONS.map((plan) => {
            const ent = PLAN_ENTITLEMENTS[plan.id];
            return (
              <article key={plan.id}>
                <h3>{plan.name}</h3>
                <dl>
                  {Object.entries({
                    "Contact limits": plan.contactLimit
                      ? `${plan.contactLimit.toLocaleString()}${plan.contactSales ? "+" : ""} contacts${plan.contactSales ? "; custom volume by quote" : ""}`
                      : "Custom",
                    Campaigns: ent.campaigns,
                    "SMS allowances": ent.sms,
                    "Ringless voicemail": ent.rvm,
                    Email: ent.email,
                    "AI features":
                      "AI drafting depends on provider configuration and account usage limits; no unlimited allowance is promised.",
                    "Team access": `${plan.usersIncluded} ${plan.usersIncluded === 1 ? "user" : "users"} included`,
                    Analytics:
                      ent.scoring ??
                      "Recorded campaign activity and available delivery results; metrics depend on provider evidence.",
                    Onboarding: SITE_OFFER.whiteGlove.shortLine,
                    Integrations:
                      "Google Calendar and Dotloop where configured and authorized. Messaging providers require setup; usage charges may apply.",
                  }).map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            );
          })}
        </div>
      </details>
      <section
        className="approved-pricing-faq"
        aria-labelledby="pricing-faq-title"
      >
        <h2 id="pricing-faq-title">A few thoughtful answers.</h2>
        {[
          [
            `What happens after the ${SITE_OFFER.trialDays}-day trial?`,
            "The trial does not require a payment method. If no payment method is added, the subscription pauses at the end of the trial. Review your billing details in Settings before continuing with a paid plan.",
          ],
          [
            "Can I change plans?",
            "Manage plan choices in Settings → Billing. Review the displayed billing details before confirming a change. Payment methods, invoices and supported subscription controls are available through the Stripe billing portal.",
          ],
          [
            "Is white-glove setup included?",
            `${SITE_OFFER.whiteGlove.shortLine}. ${SITE_OFFER.whiteGlove.detail}`,
          ],
          [
            "What are the messaging limits?",
            "Starter uses pay-as-you-go SMS and ringless voicemail. Growth and Pro include monthly allowances shown in the comparison. Free trials have separate safety caps: " +
              `${FOUNDING_100.trialUsageCaps.sms} SMS, ${FOUNDING_100.trialUsageCaps.rvm} ringless voicemails and ${FOUNDING_100.trialUsageCaps.email} emails.`,
          ],
          [
            "Can teams use MyARI?",
            `Pro includes up to ${PLAN_OPTIONS.find((p) => p.id === "pro")!.usersIncluded} users. Team includes ${PLAN_OPTIONS.find((p) => p.id === "team")!.usersIncluded} users with custom volume and shared workflows; contact us to discuss your requirements.`,
          ],
          [
            "What happens if I exceed my plan limits?",
            `Growth and Pro sending pauses when an included monthly SMS or voicemail allowance is exhausted; upgrade or wait until the next month. Annual billing preserves monthly allowances. Starter SMS and voicemail are pay-as-you-go at $${PAYG_RATES.sms.toFixed(2)} per SMS and $${PAYG_RATES.rvm.toFixed(2)} per ringless voicemail. Trial caps, contact limits, consent controls and account safety limits still apply. Team volume requires a quote.`,
          ],
          [
            "Is founding-member pricing guaranteed for everyone?",
            SITE_OFFER.founding.memberBenefit +
              " Eligibility is determined by your account and billing records; the reference prices shown here are not a guarantee of eligibility.",
          ],
        ].map(([q, a]) => (
          <details key={q}>
            <summary>
              {q}
              <span aria-hidden="true">＋</span>
            </summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
    </section>
  );
}
