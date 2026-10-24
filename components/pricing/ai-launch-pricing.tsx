"use client";
import { useState } from "react";
import { LandingPricing } from "@/components/landing/landing-pricing";
import Link from "next/link";
import {
  AI_LIMITS,
  AI_CAPABILITY_LABELS,
  AI_PLUS_MONTHLY_DIFFERENCE,
  underlyingCrm,
} from "@/lib/billing/ai/catalog";
import type { publicAiLaunch } from "@/lib/billing/ai/launch";
export function AiLaunchPricing({
  launch,
}: {
  launch: NonNullable<ReturnType<typeof publicAiLaunch>>;
}) {
  const [choice, setChoice] = useState<"crm" | "ai">("crm");
  return (
    <>
      <div
        className="landing-shell approved-billing"
        role="group"
        aria-label="Subscription choice"
      >
        <button
          aria-pressed={choice === "crm"}
          onClick={() => setChoice("crm")}
        >
          CRM Only
        </button>
        <button aria-pressed={choice === "ai"} onClick={() => setChoice("ai")}>
          CRM + AI
        </button>
      </div>
      {choice === "crm" ? (
        <LandingPricing />
      ) : (
        <section className="approved-pricing landing-shell">
          <div className="approved-pricing-intro">
            <div>
              <h2>Choose your plan.</h2>
              <p>
                <strong>Growth AI</strong> is recommended for active agents.
                Monthly billing.
              </p>
            </div>
          </div>
          <div className="approved-plan-grid">
            {launch.plans.map((plan) => (
              <article
                key={plan.id}
                className={`approved-plan ${plan.id === "growth" ? "approved-plan-featured" : ""}`}
              >
                {plan.id === "growth" && (
                  <span className="approved-popular">Most popular</span>
                )}
                <header>
                  <h3>{plan.name}</h3>
                  <p>{underlyingCrm(plan.id).description}</p>
                </header>
                <div className="approved-price">
                  <strong>${plan.monthly}</strong>
                  <span>/mo</span>
                </div>
                <p className="approved-founding">
                  AI Assistant Included · AI Plus
                </p>
                <ul>
                  <li>
                    {underlyingCrm(plan.id).contactLimit?.toLocaleString()}{" "}
                    contacts
                  </li>
                  <li>
                    {underlyingCrm(plan.id).usersIncluded} included CRM users
                  </li>
                  <li>
                    Existing {underlyingCrm(plan.id).name} CRM capabilities
                  </li>
                  <li>CRM-aware drafting, tasks and calendar preparation</li>
                  <li>Private flyer/document drafts and AI Command Center</li>
                </ul>
                <Link
                  className="approved-plan-cta"
                  href={`/dashboard/settings?tab=billing&aiPlan=${plan.id}`}
                >
                  Review {plan.name} →
                </Link>
              </article>
            ))}
          </div>
          <p>{launch.terms}</p>
          <p>
            AI Plus is included in these total monthly prices: $
            {AI_PLUS_MONTHLY_DIFFERENCE}/month more than the corresponding CRM
            Only plan. Choose one subscription, not both. No separate AI fee.
            Existing subscriptions and annual billing remain unchanged.
          </p>
          <details className="reviews-referrals">
            <summary>Your AI assistant, built into MyARI.</summary>
            <p>
              AI Plus includes CRM-aware assistance, campaign/message drafting,
              tasks/reminders, calendar preparation, premium documents,
              supported transcription, daily briefing and Command Center.
              Voice/audio features require supported and authorized providers.
              AI Plus never grants additional CRM seats or permissions.
            </p>
            <div className="ai-comparison-grid">
              {(["plus"] as const).map((tier) => (
                <div key={tier}>
                  <h3>AI {tier === "plus" ? "Plus" : "Pro"}</h3>
                  <ul>
                    {Object.entries(AI_LIMITS[tier]).map(([key, value]) => (
                      <li key={key}>
                        {AI_CAPABILITY_LABELS[
                          key as keyof typeof AI_LIMITS.plus
                        ].replace("seconds", "minutes")}
                        : {key.endsWith("_seconds") ? value / 60 : value}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p>
              Audio is metered in actual processed seconds, rounded up to one
              second. AI plans are billed monthly. CRM Only annual billing
              remains available.
            </p>
          </details>
        </section>
      )}
    </>
  );
}
