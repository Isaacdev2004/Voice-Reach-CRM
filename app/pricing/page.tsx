import type { Metadata } from "next";
import Link from "next/link";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { FOUNDING_100 } from "@/lib/marketing/founding";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "ARI CRM Pricing | Plans for Real Estate Agents",
  description:
    "Compare ARI CRM plans for real estate agents — Starter, Growth, and Pro. 14-day free trial, white-glove setup, and month-to-month billing. No long-term contracts.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <MarketingShell>
      <section className="hero-gradient py-12 md:py-16">
        <div className="landing-shell mx-auto max-w-[44rem] text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep md:text-[12px]">
            Pricing
          </p>
          <h1 className="mt-3 font-serif text-[2.25rem] font-semibold leading-tight text-ink md:text-[2.75rem] lg:text-[3rem]">
            Plans built for agents who follow up
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-slate-text md:text-[17px] lg:text-[18px]">
            Start with a {FOUNDING_100.trialDays}-day free trial. {FOUNDING_100.name} members get
            white-glove setup, founding-member pricing, and month-to-month billing — cancel anytime.
          </p>
          <div className="mt-8">
            <StartFreeButton
              location="pricing-hero"
              label="Start Your 14-Day Free Trial"
              showArrow
              className="!px-10 !py-4 !text-[15px]"
            />
          </div>
        </div>
      </section>

      <LandingPricing />

      <section className="bg-ivory py-10 md:py-12">
        <div className="landing-shell mx-auto max-w-[44rem]">
          <h2 className="font-serif text-[24px] font-semibold text-ink md:text-[28px]">
            Which plan is right for you?
          </h2>
          <ul className="mt-5 space-y-4 text-[15px] leading-relaxed text-slate-text md:text-[16px]">
            <li>
              <strong className="font-semibold text-ink">Starter</strong> — New agents building their
              first pipeline with pay-as-you-go messaging.
            </li>
            <li>
              <strong className="font-semibold text-ink">Growth</strong> — Active agents who want
              automated follow-up with included SMS and voicemail allotments. Our most popular plan.
            </li>
            <li>
              <strong className="font-semibold text-ink">Pro</strong> — High-volume agents and small
              teams who need larger messaging limits and advanced automation.
            </li>
            <li>
              <strong className="font-semibold text-ink">Team</strong> — Brokerages and teams.{" "}
              <Link href="/contact" className="font-semibold text-rose-gold-deep hover:underline">
                Contact us
              </Link>{" "}
              for volume pricing and a live walkthrough.
            </li>
          </ul>
          <p className="mt-6 text-[15px] text-slate-text">
            All plans include the ARI CRM, pipeline management, campaign builder, and compliance
            tools. Cancel anytime from your account settings.
          </p>
        </div>
      </section>

      <LandingFaq />
    </MarketingShell>
  );
}
