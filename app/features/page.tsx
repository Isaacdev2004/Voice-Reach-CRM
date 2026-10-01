import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { FEATURE_PAGE_SLUGS, FEATURE_PAGES } from "@/lib/seo/feature-pages";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "ARI CRM Features for Real Estate Agents",
  description:
    "Explore ARI CRM features — automated follow-up, lead management, SMS and email automation, pipeline, reactivation, and task reminders for Realtors.",
  path: "/features",
});

export default function FeaturesIndexPage() {
  return (
    <MarketingShell>
      <section className="hero-gradient py-12 md:py-16">
        <div className="landing-shell mx-auto max-w-[44rem] text-center">
          <h1 className="font-serif text-[2.25rem] font-semibold text-ink md:text-[2.75rem]">
            Features built for real estate follow-up
          </h1>
          <p className="mt-4 text-[16px] leading-relaxed text-slate-text md:text-[17px]">
            Every ARI feature connects to one goal — organize leads, automate outreach, and show you
            who to contact next.
          </p>
        </div>
      </section>

      <section className="bg-cream py-10 md:py-14">
        <div className="landing-shell grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_PAGE_SLUGS.map((slug) => {
            const page = FEATURE_PAGES[slug];
            return (
              <Link
                key={slug}
                href={page.path}
                className="group rounded-2xl border border-outline-variant/15 bg-ivory p-6 transition-colors hover:border-rose-gold/30"
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest text-rose-gold-deep">
                  Feature
                </p>
                <h2 className="mt-2 font-serif text-[20px] font-semibold text-ink group-hover:text-rose-gold-deep">
                  {page.h1}
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-text">{page.intro}</p>
                <span className="mt-4 inline-block text-[14px] font-semibold text-rose-gold-deep">
                  Learn more →
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="hero-gradient py-10 text-center md:py-12">
        <div className="landing-shell">
          <StartFreeButton location="features-index" label="Start Your 14-Day Free Trial" showArrow />
        </div>
      </section>
    </MarketingShell>
  );
}
