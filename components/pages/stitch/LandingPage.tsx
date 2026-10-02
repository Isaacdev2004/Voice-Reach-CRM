import Image from "next/image";
import Link from "next/link";
import { DemoVideo } from "@/components/landing/demo-video";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFeaturesBar } from "@/components/landing/landing-features-bar";
import { LandingFinalCta } from "@/components/landing/landing-final-cta";
import { LandingFlywheel } from "@/components/landing/landing-flywheel";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingSeoTopics } from "@/components/landing/landing-seo-topics";
import { LandingProductProof } from "@/components/landing/landing-product-proof";
import { LandingReactivation } from "@/components/landing/landing-reactivation";
import { LandingWhiteGlove } from "@/components/landing/landing-white-glove";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { Icon } from "@/components/ui/icon";
import { FOUNDING_100 } from "@/lib/marketing/founding";
import { SITE_OFFER, trialCtaLabel } from "@/lib/marketing/site-offer";

const DASHBOARD_IMAGE = "/brand/ari-dashboard-hero.png";

const HERO_TRUST = [
  `${FOUNDING_100.trialDays}-day free trial`,
  SITE_OFFER.cardRequiredNote,
  SITE_OFFER.whiteGlove.shortLine,
];

const HOW_IT_WORKS = [
  {
    num: "1",
    title: "Import your leads",
    body: "Import via CSV, Zillow/Realtor.com exports, manual entry, or onboarding-assisted migration.",
  },
  {
    num: "2",
    title: "Automate follow-up",
    body: "Set up personalized campaigns via SMS, email, and ringless voicemail.",
  },
  {
    num: "3",
    title: "Close more deals",
    body: "ARI tells you who to contact next so you focus on the hottest opportunities.",
  },
];

export function LandingPage() {
  return (
    <MarketingShell variant="home">
      {/* Hero */}
      <section className="hero-gradient">
        <div className="landing-shell grid items-center gap-10 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] md:gap-10 md:py-16 lg:gap-14 lg:py-20 xl:gap-16">
          <div className="max-w-[36rem] md:max-w-none">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep md:text-[12px]">
              Real estate CRM · Automated lead follow-up
            </p>
            <h1 className="font-serif text-[2.125rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[2.5rem] md:text-[3rem] lg:text-[3.375rem] xl:text-[3.625rem]">
              Lead Follow-Up on Autopilot.
            </h1>
            <p className="mt-5 text-[16px] font-medium leading-relaxed text-ink/80 md:text-[17px] lg:text-[18px] lg:leading-[1.55]">
              Never let another lead fall through the cracks. ARI organizes your pipeline, follows
              up automatically, and shows you who to contact next — so you close more deals.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4 md:mt-10">
              <StartFreeButton
                location="hero"
                label={trialCtaLabel()}
                showArrow
                className="!px-10 !py-3.5 !text-[14px] md:!px-12 md:!py-4 md:!text-[15px]"
              />
              <a
                href="#demo"
                className="inline-flex items-center gap-2 rounded-full border border-outline-variant/25 bg-ivory/80 px-5 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:border-rose-gold/40 hover:bg-ivory md:text-[16px]"
              >
                <Icon name="play_circle" className="text-[22px] text-rose-gold-deep" />
                See How ARI Works
              </a>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              {HERO_TRUST.map((item) => (
                <li key={item} className="flex items-center gap-2 text-[14px] text-slate-text md:text-[15px]">
                  <Icon name="check_circle" className="text-[18px] text-rose-gold-deep" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative w-full md:justify-self-end">
            <div className="overflow-hidden rounded-2xl border border-outline-variant/15 shadow-[0_24px_70px_rgba(26,20,16,0.16)] lg:rounded-[1.25rem]">
              <Image
                src={DASHBOARD_IMAGE}
                alt="ARI real estate CRM dashboard showing contacts, sales pipeline, and automated lead follow-up"
                width={1200}
                height={900}
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 52vw, 680px"
                className="h-auto w-full object-cover object-top"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <LandingFeaturesBar />
      <LandingFlywheel />
      <DemoVideo />

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-[4.25rem] bg-cream py-10 md:py-12 lg:py-14">
        <div className="landing-shell">
          <div className="text-center">
            <h2 className="font-serif text-[32px] font-semibold text-ink md:text-[40px] lg:text-[44px]">
              Everything you need to keep leads moving
            </h2>
            <p className="mt-2 text-[17px] text-slate-text lg:text-[18px]">
              {SITE_OFFER.whiteGlove.setupWindow}
            </p>
          </div>
          <div className="mt-8 grid gap-8 md:mt-10 md:grid-cols-3 md:gap-6 lg:gap-8">
            {HOW_IT_WORKS.map((step) => (
              <article key={step.num} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-rose-gold/20 bg-ivory font-serif text-[20px] font-semibold text-rose-gold-deep">
                  {step.num}
                </div>
                <h3 className="mb-2 font-serif text-[22px] font-semibold text-ink lg:text-[24px]">
                  {step.title}
                </h3>
                <p className="text-[16px] leading-relaxed text-slate-text lg:text-[17px]">{step.body}</p>
              </article>
            ))}
          </div>
          <p className="mt-10 text-center text-[15px] text-slate-text">
            Learn more about our{" "}
            <Link href="/real-estate-crm" className="font-semibold text-rose-gold-deep hover:underline">
              real estate CRM
            </Link>{" "}
            and{" "}
            <Link href="/lead-follow-up" className="font-semibold text-rose-gold-deep hover:underline">
              lead follow-up system
            </Link>
            .
          </p>
        </div>
      </section>

      <LandingProductProof />
      <LandingWhiteGlove />
      <LandingReactivation />
      <LandingSeoTopics />
      <LandingPricing />
      <LandingFaq />
      <LandingFinalCta />
    </MarketingShell>
  );
}
