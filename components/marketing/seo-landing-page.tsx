import Image from "next/image";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { SeoFaqSection } from "@/components/marketing/seo-faq-section";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { Icon } from "@/components/ui/icon";
import { FOUNDING_100 } from "@/lib/marketing/founding";
import type { SeoLandingPageConfig } from "@/lib/seo/landing-pages";

const DASHBOARD_IMAGE = "/brand/ari-dashboard-hero.png";

type SeoLandingPageProps = {
  page: SeoLandingPageConfig;
};

export function SeoLandingPage({ page }: SeoLandingPageProps) {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="hero-gradient">
        <div className="landing-shell grid items-center gap-10 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] md:py-16 lg:gap-14 lg:py-20">
          <div>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep md:text-[12px]">
              {page.eyebrow}
            </p>
            <h1 className="font-serif text-[2rem] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[2.375rem] md:text-[2.75rem] lg:text-[3rem]">
              {page.h1}
            </h1>
            <p className="mt-5 text-[16px] leading-relaxed text-ink/80 md:text-[17px] lg:text-[18px]">
              {page.intro}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <StartFreeButton
                location={`seo-${page.slug}-hero`}
                label="Start Your 14-Day Free Trial"
                showArrow
                className="!px-10 !py-3.5 !text-[14px] md:!px-12 md:!py-4 md:!text-[15px]"
              />
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-full border border-outline-variant/25 bg-ivory/80 px-5 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:border-rose-gold/40 hover:bg-ivory"
              >
                View pricing
              </Link>
            </div>
            <p className="mt-6 text-[14px] text-slate-text">
              {FOUNDING_100.trialDays}-day free trial · White-glove setup included
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-outline-variant/15 shadow-[0_24px_70px_rgba(26,20,16,0.16)]">
            <Image
              src={DASHBOARD_IMAGE}
              alt={`${page.h1} — ARI CRM dashboard with contacts, pipeline, and automated follow-up`}
              width={1200}
              height={900}
              sizes="(max-width: 768px) 100vw, 50vw"
              className="h-auto w-full object-cover object-top"
              priority
            />
          </div>
        </div>
      </section>

      {/* Content sections */}
      {page.sections.map((section, index) => (
        <section
          key={section.h2}
          className={index % 2 === 0 ? "bg-cream py-12 md:py-16" : "bg-ivory py-12 md:py-16"}
        >
          <div className="landing-shell mx-auto max-w-[44rem] lg:max-w-[48rem]">
            <h2 className="font-serif text-[26px] font-semibold text-ink md:text-[32px] lg:text-[36px]">
              {section.h2}
            </h2>
            <div className="mt-5 space-y-4">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="text-[16px] leading-relaxed text-slate-text lg:text-[17px]">
                  {paragraph}
                </p>
              ))}
            </div>
            {section.bullets ? (
              <ul className="mt-6 space-y-3">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3 text-[15px] leading-relaxed text-slate-text md:text-[16px]">
                    <Icon name="check_circle" className="mt-0.5 shrink-0 text-[20px] text-rose-gold-deep" />
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
            {index === 1 ? (
              <div className="mt-8">
                <StartFreeButton
                  location={`seo-${page.slug}-mid`}
                  label="Start Your 14-Day Free Trial"
                  className="!px-8 !py-3 !text-[14px]"
                />
              </div>
            ) : null}
          </div>
        </section>
      ))}

      {/* Highlights */}
      <section className="border-y border-outline-variant/10 bg-ivory py-12 md:py-16">
        <div className="landing-shell">
          <h2 className="text-center font-serif text-[26px] font-semibold text-ink md:text-[32px]">
            Everything you need to keep leads moving
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {page.highlights.map((item) => (
              <article key={item.title} className="rounded-2xl border border-outline-variant/10 bg-cream p-6">
                <h3 className="font-serif text-[18px] font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-text">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SeoFaqSection items={page.faq} />

      {/* Related pages */}
      <section className="bg-ivory py-10 md:py-12">
        <div className="landing-shell">
          <h2 className="font-serif text-[22px] font-semibold text-ink md:text-[26px]">Explore more</h2>
          <nav className="mt-4 flex flex-wrap gap-3">
            {page.relatedPages.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-outline-variant/20 bg-cream px-4 py-2 text-[14px] font-medium text-ink/80 hover:border-rose-gold/40 hover:text-rose-gold-deep"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {/* Final CTA */}
      <section className="hero-gradient py-12 md:py-16">
        <div className="landing-shell text-center">
          <h2 className="font-serif text-[28px] font-semibold text-ink md:text-[36px] lg:text-[40px]">
            Start your {FOUNDING_100.trialDays}-day free trial
          </h2>
          <p className="mx-auto mt-4 max-w-[36rem] text-[16px] leading-relaxed text-slate-text md:text-[17px]">
            Join {FOUNDING_100.name} — white-glove setup, founding-member pricing, and a CRM that
            follows up so you can close more deals.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <StartFreeButton
              location={`seo-${page.slug}-final`}
              label="Start Your 14-Day Free Trial"
              showArrow
              className="!px-10 !py-4 !text-[15px]"
            />
            <Link href="/contact" className="text-[15px] font-semibold text-rose-gold-deep hover:underline">
              Talk to our team
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
