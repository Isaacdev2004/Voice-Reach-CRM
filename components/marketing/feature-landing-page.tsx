import Link from "next/link";
import { MarketingHeroImage } from "@/components/marketing/marketing-hero-image";
import { MarketingHeroBackdrop } from "@/components/marketing/marketing-hero-backdrop";
import { HeroEntrance, Reveal, RevealStagger } from "@/components/marketing/motion-reveal";
import { Breadcrumbs } from "@/components/marketing/breadcrumbs";
import { JsonLd } from "@/components/marketing/json-ld";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { Icon } from "@/components/ui/icon";
import { heroImageForFeaturePage } from "@/lib/marketing/feature-page-heroes";
import { SITE_OFFER, trialCtaLabel, trialSupportLine } from "@/lib/marketing/site-offer";
import { FEATURE_CTA_HEADLINES } from "@/lib/seo/feature-cta-headlines";
import { featureHeroObjectPosition } from "@/lib/seo/feature-hero-focus";
import type { FeaturePageConfig } from "@/lib/seo/feature-pages";
import { breadcrumbSchema, softwareApplicationSchema } from "@/lib/seo/schema";

const COMPLIANCE_FEATURE_SLUGS = new Set([
  "text-automation",
  "email-automation",
  "ringless-voicemail",
  "voice-studio",
  "client-email-updates",
  "campaign-builder",
  "automated-follow-up",
  "lead-reactivation",
]);

type FeatureLandingPageProps = {
  page: FeaturePageConfig;
};

export function FeatureLandingPage({ page }: FeatureLandingPageProps) {
  const baseHero = page.heroImage ?? heroImageForFeaturePage(page.slug);
  const focus = featureHeroObjectPosition(page.slug);
  const heroImage =
    focus && !baseHero.objectPosition
      ? { ...baseHero, objectPosition: focus }
      : baseHero;
  const schema = [
    softwareApplicationSchema({
      name: page.title,
      description: page.description,
      url: page.path,
    }),
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Features", path: "/features" },
      { name: page.h1, path: page.path },
    ]),
  ];

  return (
    <MarketingShell>
      <JsonLd data={schema} />
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Features", href: "/features" },
          { label: page.h1 },
        ]}
      />

      <MarketingHeroBackdrop>
        <div className="landing-shell grid items-center gap-10 py-8 md:grid-cols-2 md:py-12 lg:gap-14">
          <div>
            <HeroEntrance>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep">
                {page.category}
              </p>
            </HeroEntrance>
            <HeroEntrance delayMs={90}>
              <h1 className="font-serif text-[2rem] font-semibold leading-tight text-ink md:text-[2.5rem] lg:text-[2.75rem]">
                {page.h1}
              </h1>
            </HeroEntrance>
            <HeroEntrance delayMs={160}>
              <p className="mt-4 text-[16px] leading-relaxed text-slate-text md:text-[17px]">{page.intro}</p>
            </HeroEntrance>
            <HeroEntrance delayMs={230}>
              <div className="mt-7 flex flex-wrap gap-4">
                <StartFreeButton location={`feature-${page.slug}`} label={trialCtaLabel()} showArrow />
                <Link
                  href={page.relatedProductHref}
                  className="luxury-hover inline-flex items-center rounded-full border border-outline-variant/25 px-5 py-3 text-[14px] font-semibold text-ink hover:border-rose-gold/40"
                >
                  See {page.relatedProductLabel}
                </Link>
              </div>
            </HeroEntrance>
          </div>
          <HeroEntrance delayMs={140}>
            <div className="marketing-hero-image-float">
              <MarketingHeroImage image={heroImage} />
            </div>
          </HeroEntrance>
        </div>
      </MarketingHeroBackdrop>

      {page.sections.map((section, index) => (
        <section key={section.h2} className={index % 2 === 0 ? "bg-cream py-10 md:py-14" : "bg-ivory py-10 md:py-14"}>
          <Reveal className="landing-shell mx-auto max-w-[44rem]">
            <h2 className="font-serif text-[24px] font-semibold text-ink md:text-[28px]">{section.h2}</h2>
            <div className="mt-4 space-y-4">
              {section.paragraphs.map((p) => (
                <p key={p.slice(0, 48)} className="text-[16px] leading-relaxed text-slate-text">
                  {p}
                </p>
              ))}
            </div>
            {section.bullets ? (
              <ul className="mt-5 space-y-2">
                {section.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-[15px] text-slate-text">
                    <Icon name="check_circle" className="shrink-0 text-rose-gold-deep" />
                    {b}
                  </li>
                ))}
              </ul>
            ) : null}
          </Reveal>
        </section>
      ))}

      <section className="border-y border-outline-variant/10 bg-ivory py-10 md:py-12">
        <RevealStagger className="landing-shell grid gap-5 sm:grid-cols-2 lg:grid-cols-4" stepMs={80}>
          {page.highlights.map((h) => (
            <article key={h.title} className="luxury-hover rounded-xl border border-outline-variant/10 bg-cream p-5">
              <h3 className="font-serif text-[17px] font-semibold text-ink">{h.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-text">{h.body}</p>
            </article>
          ))}
        </RevealStagger>
      </section>

      <section className="hero-gradient py-12 text-center md:py-14">
        <Reveal className="landing-shell mx-auto max-w-[36rem]">
          <h2 className="font-serif text-[26px] font-semibold text-ink md:text-[32px]">
            {FEATURE_CTA_HEADLINES[page.slug]}
          </h2>
          <p className="mt-3 text-[16px] text-slate-text">
            Learn how{" "}
            <Link href={page.relatedProductHref} className="font-semibold text-rose-gold-deep hover:underline">
              {page.relatedProductLabel}
            </Link>{" "}
            works with a {SITE_OFFER.trialDays}-day free trial. {SITE_OFFER.cardRequiredNote}.
          </p>
          <p className="mt-2 text-[14px] text-taupe">{trialSupportLine()}</p>
          {COMPLIANCE_FEATURE_SLUGS.has(page.slug) ? (
            <p className="mt-4 text-[13px] leading-relaxed text-taupe">
              {SITE_OFFER.compliance.shortNote}{" "}
              {SITE_OFFER.compliance.policyLinks.map((link, i) => (
                <span key={link.href}>
                  {i > 0 ? " · " : null}
                  <Link href={link.href} className="font-medium text-rose-gold-deep hover:underline">
                    {link.label}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}
          <div className="mt-6">
            <StartFreeButton location={`feature-${page.slug}-final`} label={trialCtaLabel()} showArrow />
          </div>
        </Reveal>
      </section>
    </MarketingShell>
  );
}
