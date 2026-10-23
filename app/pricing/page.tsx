import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PricingDetails } from "@/components/pricing/pricing-details";
import { PlaybookCtaLink } from "@/components/landing/playbook-cta-link";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { SITE_OFFER } from "@/lib/marketing/site-offer";
import { PLAN_OPTIONS } from "@/lib/billing/plans";
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
      <section className="approved-pricing-hero">
        <Image
          src="/brand/marketing/pricing-olive-office.webp"
          alt="Sunlit organic-modern home office with an olive tree, natural oak and travertine"
          fill
          priority
          sizes="100vw"
        />
        <div className="landing-shell">
          <div className="approved-hero-copy">
            <p className="public-eyebrow">Pricing</p>
            <h1>Plans built for agents who follow up</h1>
            <p>
              Start with a {SITE_OFFER.trialDays}-day free trial.{" "}
              {SITE_OFFER.whiteGlove.shortLine}.
            </p>
          </div>
        </div>
      </section>
      <LandingPricing />
      <section
        className="approved-benefits landing-shell"
        aria-label="Shared plan benefits"
      >
        {[
          [
            "redeem",
            `${SITE_OFFER.trialDays}-day free trial`,
            "No credit card required",
          ],
          ["settings", "White-glove setup", "Included on every plan"],
          ...(SITE_OFFER.founding.active
            ? [
                [
                  "groups",
                  "Founding 100 benefits",
                  "Founding-member pricing while eligible",
                ],
                ["forum", "Direct feedback access", "Help shape what’s next"],
              ]
            : []),
        ].map(([icon, title, description]) => (
          <div key={title}>
            <span className="material-symbols-outlined" aria-hidden="true">
              {icon}
            </span>
            <div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          </div>
        ))}
      </section>
      <section className="approved-playbook landing-shell">
        <div className="approved-playbook-symbol" aria-hidden="true">
          <span className="material-symbols-outlined">menu_book</span>
        </div>
        <div>
          <h2>Get the free playbook</h2>
          <p>
            Our step-by-step guide to real estate follow-up systems that convert
            more leads into clients.
          </p>
        </div>
        <PlaybookCtaLink
          label="Get the Free Playbook →"
          location="pricing-shared"
          className="approved-playbook-cta"
        />
      </section>
      <PricingDetails />
      <section className="approved-team landing-shell">
        <p>
          <strong>Need more room to grow?</strong> Team starts at $
          {PLAN_OPTIONS.find((plan) => plan.id === "team")!.price}/month with 5
          users and custom volume.
        </p>
        <Link href="/contact">Discuss Team →</Link>
      </section>
    </MarketingShell>
  );
}
