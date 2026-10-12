import type { Metadata } from "next";
import Link from "next/link";
import { FeaturesIndexGrid } from "@/components/marketing/features-index-grid";
import { MarketingHeroBackdrop } from "@/components/marketing/marketing-hero-backdrop";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { FEATURE_DISPLAY_ORDER, FEATURE_PAGES } from "@/lib/seo/feature-pages";
import { SITE_OFFER, trialCtaLabel } from "@/lib/marketing/site-offer";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "ARI CRM Features for Real Estate Agents",
  description:
    "Explore every ARI CRM feature - ringless voicemail, campaign builder, lead management, Notes & Strategy, mortgage calculator, Property Finder, email updates, Dotloop, and more.",
  path: "/features",
});

const CATEGORY_ORDER = ["CRM", "Follow-up", "Agent tools", "Integrations"] as const;

export default function FeaturesIndexPage() {
  const byCategory = CATEGORY_ORDER.map((category) => ({
    category,
    items: FEATURE_DISPLAY_ORDER.filter((slug) => FEATURE_PAGES[slug].category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <MarketingShell>
      <MarketingHeroBackdrop className="py-12 md:py-16">
        <div className="landing-shell mx-auto max-w-[44rem] animate-marketing-rise text-center motion-reduce:animate-none">
          <h1 className="font-serif text-[2.25rem] font-semibold text-ink md:text-[2.75rem]">
            Everything inside ARI - from first lead to closed deal
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-slate-text md:text-[17px]">
            Organized by job-to-be-done: capture and manage leads, automate follow-up, run agent
            tools, and connect integrations - the same workflow agents use after sign-in, from first
            inquiry to closed deal.
          </p>
        </div>
      </MarketingHeroBackdrop>

      <FeaturesIndexGrid groups={byCategory} />

      <section className="border-t border-outline-variant/10 bg-ivory py-10 md:py-12">
        <div className="landing-shell mx-auto max-w-[44rem]">
          <h2 className="text-center font-serif text-[22px] font-semibold text-ink md:text-[26px]">
            How ARI fits together
          </h2>
          <p className="mt-3 text-center text-[15px] leading-relaxed text-slate-text md:text-[16px]">
            Capture → automate follow-up → nurture → tasks &amp; reminders → re-engage → close.
            Integrations:{" "}
            {SITE_OFFER.integrations.connected.map((i, idx) => (
              <span key={i.href}>
                {idx > 0 ? " · " : null}
                <Link href={i.href} className="font-semibold text-rose-gold-deep hover:underline">
                  {i.label}
                </Link>
              </span>
            ))}
            . Import via {SITE_OFFER.integrations.importSources.join(", ")}.
          </p>
        </div>
      </section>

      <section className="bg-cream py-10 md:py-12">
        <div className="landing-shell mx-auto max-w-[44rem] text-center">
          <h2 className="font-serif text-[22px] font-semibold text-ink md:text-[26px]">
            New client walkthrough
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-text md:text-[16px]">
            Import leads → build a campaign (SMS, email, RVM) → use Voice Studio for voicemail →
            track tasks on Calendar → log Notes &amp; Strategy → share Property Finder links and
            mortgage estimates → send email updates to your database. All in one CRM.
          </p>
        </div>
      </section>

      <section className="hero-gradient py-10 text-center md:py-12">
        <div className="landing-shell">
          <StartFreeButton location="features-index" label={trialCtaLabel()} showArrow />
        </div>
      </section>
    </MarketingShell>
  );
}
