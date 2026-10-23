import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { PlanEntitlementsPanel } from "@/components/pricing/plan-entitlements-panel";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { primaryTrialCta, SITE_OFFER } from "@/lib/marketing/site-offer";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "MyARI CRM Pricing | Plans for Real Estate Agents",
  description:
    "Compare MyARI CRM plans for real estate agents - Starter, Growth, and Pro. 14-day free trial, white-glove setup, and month-to-month billing. No long-term contracts.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <MarketingShell contentClassName="public-prose">
      <section className="public-pricing-hero landing-shell">
        <div>
          <p className="public-eyebrow">Pricing</p>
          <h1>Plans built for agents who follow up</h1>
          <p>
            Start with a {SITE_OFFER.trialDays}-day free trial.{" "}
            {SITE_OFFER.whiteGlove.shortLine}.
          </p>
          <StartFreeButton
            location="pricing-hero"
            label={primaryTrialCta()}
            showArrow
            className="public-trial-button"
          />
        </div>
        <div className="public-pricing-photo">
          <Image
            src="/brand/heroes/settings-office.png"
            alt="Sunlit home office with natural materials and botanical greenery"
            fill
            priority
            sizes="(max-width:767px) 94vw, 45vw"
          />
        </div>
      </section>
      <div className="public-pricing-plans">
        <LandingPricing compact />
      </div>
      {SITE_OFFER.founding.active && (
        <p className="public-shared-plan-benefits landing-shell">
          {SITE_OFFER.founding.memberBenefit}
        </p>
      )}

      <PlanEntitlementsPanel />

      <section className="bg-ivory py-10 md:py-12">
        <div className="landing-shell mx-auto max-w-[44rem] public-reading-column">
          <h2 className="font-serif text-[24px] font-semibold text-ink md:text-[28px]">
            Which plan is right for you?
          </h2>
          <ul className="mt-5 space-y-4 text-[15px] leading-relaxed text-slate-text md:text-[16px]">
            <li>
              <strong className="font-semibold text-ink">Starter</strong> - New
              agents building their first pipeline with pay-as-you-go messaging.
            </li>
            <li>
              <strong className="font-semibold text-ink">Growth</strong> -
              Active agents who want automated follow-up with included SMS and
              voicemail allotments. Our most popular plan.
            </li>
            <li>
              <strong className="font-semibold text-ink">Pro</strong> -
              High-volume agents and small teams who need larger messaging
              limits and advanced automation.
            </li>
            <li>
              <strong className="font-semibold text-ink">Team</strong> -
              Brokerages and teams.{" "}
              <Link
                href="/contact"
                className="font-semibold text-rose-gold-deep hover:underline"
              >
                Contact us
              </Link>{" "}
              for volume pricing and a live walkthrough.
            </li>
          </ul>
          <p className="mt-6 text-[15px] text-slate-text">
            {SITE_OFFER.plans.allPlansInclude} Cancel anytime from your account
            settings.
          </p>
        </div>
      </section>

      <LandingFaq />
      <section className="public-pricing-final landing-shell">
        <div>
          <p className="public-eyebrow">Your next chapter</p>
          <h2>Thoughtful follow-up starts here.</h2>
        </div>
        <StartFreeButton
          location="pricing-final"
          className="public-trial-button"
          showArrow
        />
      </section>
    </MarketingShell>
  );
}
