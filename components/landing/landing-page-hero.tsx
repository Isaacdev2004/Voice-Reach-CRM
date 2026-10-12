"use client";

import { MarketingHeroImage } from "@/components/marketing/marketing-hero-image";
import { MarketingHeroBackdrop } from "@/components/marketing/marketing-hero-backdrop";
import { HeroEntrance } from "@/components/marketing/motion-reveal";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { Icon } from "@/components/ui/icon";
import { HERO_IMAGES } from "@/lib/marketing/hero-images";
import { primaryTrialCta, SITE_OFFER, trialDisclosureLine } from "@/lib/marketing/site-offer";

export function LandingPageHero() {
  return (
    <MarketingHeroBackdrop>
      <div className="landing-shell grid items-center gap-10 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] md:gap-10 md:py-16 lg:gap-14 lg:py-20 xl:gap-16">
        <div className="max-w-[36rem] md:max-w-none">
          <HeroEntrance delayMs={0}>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep md:text-[12px]">
              {SITE_OFFER.hero.eyebrow}
            </p>
          </HeroEntrance>
          <HeroEntrance delayMs={80}>
            <h1 className="font-serif text-[2.125rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[2.5rem] md:text-[3rem] lg:text-[3.375rem] xl:text-[3.625rem]">
              {SITE_OFFER.hero.headline}
            </h1>
          </HeroEntrance>
          <HeroEntrance delayMs={160}>
            <p className="mt-5 text-[16px] font-medium leading-relaxed text-ink/80 md:text-[17px] lg:text-[18px] lg:leading-[1.55]">
              {SITE_OFFER.hero.body}
            </p>
          </HeroEntrance>
          <HeroEntrance delayMs={220}>
            <p className="mt-4 font-serif text-[20px] font-semibold text-ink md:text-[22px] lg:text-[24px]">
              {SITE_OFFER.hero.tagline}
            </p>
          </HeroEntrance>
          <HeroEntrance delayMs={300}>
            <div className="mt-8 flex flex-wrap items-center gap-4 md:mt-10">
              <StartFreeButton
                location="hero"
                label={primaryTrialCta()}
                showArrow
                className="luxury-pressable !px-10 !py-3.5 !text-[14px] md:!px-12 md:!py-4 md:!text-[15px]"
              />
              <a
                href="#demo"
                className="luxury-hover inline-flex items-center gap-2 rounded-full border border-outline-variant/25 bg-ivory/80 px-5 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:border-rose-gold/40 hover:bg-ivory md:text-[16px]"
              >
                <Icon name="play_circle" className="text-[22px] text-rose-gold-deep" />
                See How ARI Works
              </a>
            </div>
          </HeroEntrance>
          <HeroEntrance delayMs={380}>
            <p className="mt-8 text-[14px] text-slate-text md:text-[15px]">{trialDisclosureLine()}</p>
          </HeroEntrance>
        </div>

        <HeroEntrance delayMs={200} className="relative w-full md:justify-self-end">
          <div className="marketing-hero-image-float">
            <MarketingHeroImage image={HERO_IMAGES.homeDashboard} priority />
          </div>
        </HeroEntrance>
      </div>
    </MarketingHeroBackdrop>
  );
}
