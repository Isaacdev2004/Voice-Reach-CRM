"use client";

import Link from "next/link";

import { MarketingHeroImage } from "@/components/marketing/marketing-hero-image";
import { MarketingHeroBackdrop } from "@/components/marketing/marketing-hero-backdrop";
import { HeroEntrance } from "@/components/marketing/motion-reveal";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { SITE_OFFER, trialCtaLabel } from "@/lib/marketing/site-offer";
import type { SeoLandingPageConfig } from "@/lib/seo/landing-pages";

type SeoLandingPageHeroProps = {
  page: SeoLandingPageConfig;
};

export function SeoLandingPageHero({ page }: SeoLandingPageHeroProps) {
  return (
    <MarketingHeroBackdrop>
      <div className="landing-shell grid items-center gap-10 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] md:py-10 lg:gap-10 lg:py-12">
        <div>
          <HeroEntrance>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep md:text-[12px]">
              {page.eyebrow}
            </p>
          </HeroEntrance>
          <HeroEntrance delayMs={90}>
            <h1 className="font-serif text-[2rem] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[2.375rem] md:text-[2.75rem] lg:text-[3rem]">
              {page.h1}
            </h1>
          </HeroEntrance>
          <HeroEntrance delayMs={170}>
            <p className="mt-5 text-[16px] leading-relaxed text-ink/80 md:text-[17px] lg:text-[18px]">
              {page.intro}
            </p>
          </HeroEntrance>
          <HeroEntrance delayMs={250}>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <StartFreeButton
                location={`seo-${page.slug}-hero`}
                label={trialCtaLabel()}
                showArrow
                className="luxury-pressable !px-10 !py-3.5 !text-[14px] md:!px-12 md:!py-4 md:!text-[15px]"
              />
              <Link
                href="/pricing"
                className="luxury-hover inline-flex items-center gap-2 rounded-full border border-outline-variant/25 bg-ivory/80 px-5 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:border-rose-gold/40 hover:bg-ivory"
              >
                View pricing
              </Link>
            </div>
          </HeroEntrance>
          <HeroEntrance delayMs={320}>
            <p className="mt-6 text-[14px] text-slate-text">
              {SITE_OFFER.trialDays}-day free trial · {SITE_OFFER.whiteGlove.shortLine}
            </p>
          </HeroEntrance>
        </div>

        <HeroEntrance delayMs={140}>
          <div className="marketing-hero-product-proof">
            <MarketingHeroImage image={page.heroImage} priority />
          </div>
        </HeroEntrance>
      </div>
    </MarketingHeroBackdrop>
  );
}
