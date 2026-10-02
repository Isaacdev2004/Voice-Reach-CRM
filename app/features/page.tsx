import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { FEATURE_DISPLAY_ORDER, FEATURE_PAGES } from "@/lib/seo/feature-pages";
import { SITE_OFFER, trialCtaLabel } from "@/lib/marketing/site-offer";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "ARI CRM Features for Real Estate Agents",
  description:
    "Explore every ARI CRM feature — ringless voicemail, campaign builder, lead management, Notes & Strategy, mortgage calculator, Property Finder, email updates, Dotloop, and more.",
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
      <section className="hero-gradient py-12 md:py-16">
        <div className="landing-shell mx-auto max-w-[44rem] text-center">
          <h1 className="font-serif text-[2.25rem] font-semibold text-ink md:text-[2.75rem]">
            Everything inside ARI — from first lead to closed deal
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-slate-text md:text-[17px]">
            Organized by job-to-be-done: capture and manage leads, automate follow-up, run agent
            tools, and connect integrations — the same workflow agents use after sign-in, from first
            inquiry to closed deal.
          </p>
        </div>
      </section>

      <section className="bg-cream py-10 md:py-14">
        <div className="landing-shell space-y-12">
          {byCategory.map(({ category, items }) => (
            <div key={category}>
              <h2 className="font-serif text-[22px] font-semibold text-ink md:text-[26px]">
                {category}
              </h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((slug) => {
                  const page = FEATURE_PAGES[slug];
                  return (
                    <Link
                      key={slug}
                      href={page.path}
                      className="group flex h-full flex-col rounded-2xl border border-outline-variant/15 bg-ivory p-6 transition-colors hover:border-rose-gold/30"
                    >
                      <h3 className="font-serif text-[19px] font-semibold leading-snug text-ink group-hover:text-rose-gold-deep md:text-[20px]">
                        {page.eyebrow}
                      </h3>
                      <p className="mt-2 flex-1 text-[15px] leading-relaxed text-slate-text">
                        {page.intro}
                      </p>
                      <span className="mt-4 inline-block text-[14px] font-semibold text-rose-gold-deep">
                        Learn more →
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

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
