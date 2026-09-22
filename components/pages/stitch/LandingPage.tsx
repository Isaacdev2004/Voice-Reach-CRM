import Image from "next/image";
import Link from "next/link";
import { AriLogo } from "@/components/brand/ari-logo";
import { DemoVideo } from "@/components/landing/demo-video";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFeaturesBar } from "@/components/landing/landing-features-bar";
import { LandingFinalCta } from "@/components/landing/landing-final-cta";
import { LandingFlywheel } from "@/components/landing/landing-flywheel";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingTestimonials } from "@/components/landing/landing-testimonials";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { Icon } from "@/components/ui/icon";
import { BRAND_DOMAIN, BRAND_NAME, BRAND_URL } from "@/lib/brand";
import { FOUNDING_100 } from "@/lib/marketing/founding";

const SIGN_UP = "/sign-up";
const DASHBOARD_IMAGE = "/brand/ari-dashboard-hero.png";

const HERO_TRUST = [
  `${FOUNDING_100.trialDays}-day free trial`,
  "White-glove setup",
  "No spreadsheets. No sticky notes.",
];

const HOW_IT_WORKS = [
  {
    num: "1",
    title: "Import your leads",
    body: "Easily bring in your contacts from Zillow, Realtor.com, CSV, or your existing tools.",
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
    <div className="min-h-screen bg-cream text-ink">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-outline-variant/15 bg-ivory/95 backdrop-blur-md">
        <nav className="landing-shell grid h-14 grid-cols-[1fr_auto_1fr] items-center md:h-[4.25rem]">
          <Link href="/" className="justify-self-start" aria-label={`${BRAND_NAME} home`}>
            <AriLogo height={48} />
          </Link>
          <div className="hidden items-center gap-9 justify-self-center md:flex">
            <a href="#features" className="text-[15px] text-ink/70 hover:text-rose-gold-deep">
              Platform
            </a>
            <a href="#pricing" className="text-[15px] text-ink/70 hover:text-rose-gold-deep">
              Pricing
            </a>
            <a href="#how-it-works" className="text-[15px] text-ink/70 hover:text-rose-gold-deep">
              How it works
            </a>
            <a href="#faq" className="text-[15px] text-ink/70 hover:text-rose-gold-deep">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-4 justify-self-end">
            <Link
              href="/sign-in"
              className="hidden text-[15px] font-medium text-ink/75 hover:text-ink sm:block"
            >
              Log in
            </Link>
            <StartFreeButton className="!px-6 !py-2.5 !text-[13px] md:!px-7 md:!py-3 md:!text-[14px]" />
          </div>
        </nav>
      </header>

      <main className="pt-14 md:pt-[4.25rem]">
        {/* Hero */}
        <section className="hero-gradient">
          <div className="landing-shell grid items-center gap-10 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] md:gap-10 md:py-16 lg:gap-14 lg:py-20 xl:gap-16">
            <div className="max-w-[36rem] md:max-w-none">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep md:text-[12px]">
                The CRM for modern real estate agents
              </p>
              <h1 className="font-serif text-[2.125rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[2.5rem] md:text-[3rem] lg:text-[3.375rem] xl:text-[3.625rem]">
                Stop losing leads you already paid for.
              </h1>
              <p className="mt-5 text-[16px] font-medium leading-relaxed text-ink/80 md:text-[17px] lg:text-[18px] lg:leading-[1.55]">
                {BRAND_NAME} organizes your leads, follows up automatically, and shows you who to
                contact next — so you close more deals.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4 md:mt-10">
                <StartFreeButton
                  location="hero"
                  showArrow
                  className="!px-10 !py-3.5 !text-[14px] md:!px-12 md:!py-4 md:!text-[15px]"
                />
                <a
                  href="#demo"
                  className="inline-flex items-center gap-2 rounded-full border border-outline-variant/25 bg-ivory/80 px-5 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:border-rose-gold/40 hover:bg-ivory md:text-[16px]"
                >
                  <Icon name="play_circle" className="text-[22px] text-rose-gold-deep" />
                  See ARI in action
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
                  alt="ARI CRM dashboard showing contacts, tasks, and marketing pulse on desktop"
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
        <section id="how-it-works" className="bg-ivory py-16 md:py-20 lg:py-24">
          <div className="landing-shell">
            <div className="text-center">
              <h2 className="font-serif text-[28px] font-semibold text-ink md:text-[36px] lg:text-[40px]">
                How it works
              </h2>
              <p className="mt-3 text-[16px] text-slate-text lg:text-[17px]">
                Get started in minutes. Start closing more deals in days.
              </p>
            </div>
            <div className="mt-12 grid gap-10 md:mt-14 md:grid-cols-3 md:gap-8 lg:gap-12">
              {HOW_IT_WORKS.map((step) => (
                <article key={step.num} className="text-center">
                  <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-rose-gold/20 bg-cream font-serif text-[18px] font-semibold text-rose-gold-deep">
                    {step.num}
                  </div>
                  <h3 className="mb-3 font-serif text-[20px] font-semibold text-ink lg:text-[22px]">
                    {step.title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-slate-text lg:text-[16px]">
                    {step.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <LandingTestimonials />
        <LandingPricing />
        <LandingFaq />
        <LandingFinalCta />
      </main>

      <footer className="border-t border-outline-variant/15 bg-ivory py-10 md:py-12">
        <div className="landing-shell">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:gap-8">
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-center">
              <AriLogo height={32} />
              <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[14px] text-slate-text">
                <a href="#features" className="hover:text-rose-gold-deep">
                  Platform
                </a>
                <a href="#pricing" className="hover:text-rose-gold-deep">
                  Pricing
                </a>
                <a href="#how-it-works" className="hover:text-rose-gold-deep">
                  How it works
                </a>
                <a href="#faq" className="hover:text-rose-gold-deep">
                  FAQ
                </a>
              </nav>
            </div>
            <div className="flex items-center gap-5 text-[13px] text-taupe">
              <span>© {new Date().getFullYear()} {BRAND_NAME}</span>
              <Link href="/privacy" className="hover:text-rose-gold-deep">
                Privacy
              </Link>
              <Link href="/contact" className="hover:text-rose-gold-deep">
                Contact
              </Link>
              <a href={BRAND_URL} className="hover:text-rose-gold-deep">
                {BRAND_DOMAIN}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
