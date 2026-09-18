import Link from "next/link";
import { AriLogo } from "@/components/brand/ari-logo";
import { DashboardPreview } from "@/components/landing/dashboard-preview";
import { LandingFaq } from "@/components/landing/landing-faq";
import { CheckCircleIcon } from "@/components/icons/landing-icons";
import { BRAND_DOMAIN, BRAND_NAME, BRAND_TAGLINE, BRAND_URL } from "@/lib/brand";
import { PLAN_OPTIONS } from "@/lib/billing/plans";

const PRIMARY_CTA = "Start Free";
const SIGN_UP = "/sign-up";

const BENEFITS = [
  {
    title: "Never lose a lead",
    description:
      "Every inquiry lands in one place — tagged, staged, and ready. No more leads buried in email or spreadsheets.",
    icon: "person_search",
  },
  {
    title: "Automatic follow-up",
    description:
      "SMS, email, and ringless voicemail sequences run on schedule so prospects hear from you before they forget you.",
    icon: "bolt",
  },
  {
    title: "Know who to contact next",
    description:
      "Your dashboard surfaces hot leads, overdue tasks, and replies — so you spend time closing, not searching.",
    icon: "priority_high",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Connect your leads",
    description: "Import contacts or connect your lead sources. ARI organizes every family and stage.",
  },
  {
    step: "2",
    title: "ARI follows up",
    description: "Automated sequences nurture prospects with email, SMS, and voicemail — compliantly.",
  },
  {
    step: "3",
    title: "You close",
    description: "When someone replies or goes hot, ARI tells you exactly who to call next.",
  },
];

const DEMO_STEPS = [
  { label: "New lead arrives", detail: "Imported from Zillow, website, or CSV" },
  { label: "Auto follow-up sends", detail: "Email + SMS sequence day 1, 3, 7" },
  { label: "Prospect responds", detail: "Reply tracked in contact timeline" },
  { label: "Dashboard updates", detail: "Lead moves to Hot — task created for you" },
];

/** Placeholder until verified testimonials are approved by the team */
const TESTIMONIALS_PENDING = true;

const SALES_EMAIL = "hello@myari.io";

function PrimaryCta({ className = "" }: { className?: string }) {
  return (
    <Link
      href={SIGN_UP}
      className={`inline-flex items-center justify-center rounded-full bg-rose-gold px-8 py-3 text-label-md font-bold uppercase tracking-wide text-ivory shadow-card transition-all hover:opacity-95 active:scale-[0.98] ${className}`}
    >
      {PRIMARY_CTA}
    </Link>
  );
}

export function LandingPage() {
  const growthPlan = PLAN_OPTIONS.find((p) => p.featured)!;

  return (
    <div className="min-h-screen bg-cream text-ink">
      {/* Sticky header — CTA always visible */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-outline-variant/20 bg-champagne/95 backdrop-blur-md">
        <nav className="mx-auto flex h-14 w-full max-w-[96rem] items-center justify-between gap-3 px-4 md:h-16 md:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label={`${BRAND_NAME} home`}>
            <AriLogo height={40} className="md:hidden" />
            <AriLogo height={48} className="hidden md:block" />
          </Link>
          <div className="hidden items-center gap-6 lg:flex">
            <a href="#benefits" className="text-[13px] font-medium text-ink/70 hover:text-rose-gold-deep">
              Benefits
            </a>
            <a href="#demo" className="text-[13px] font-medium text-ink/70 hover:text-rose-gold-deep">
              Demo
            </a>
            <a href="#pricing" className="text-[13px] font-medium text-ink/70 hover:text-rose-gold-deep">
              Pricing
            </a>
            <a href="#faq" className="text-[13px] font-medium text-ink/70 hover:text-rose-gold-deep">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/sign-in"
              className="hidden rounded-full px-3 py-2 text-[13px] font-medium text-ink/75 hover:bg-ivory sm:block"
            >
              Sign in
            </Link>
            <PrimaryCta className="!px-5 !py-2 !text-[13px] !normal-case !tracking-normal" />
          </div>
        </nav>
      </header>

      <main className="pt-14 md:pt-16">
        {/* ── 1. ABOVE THE FOLD ── */}
        <section className="luxury-gradient-hero relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-0 pt-6 md:grid-cols-2 md:items-center md:gap-10 md:px-8 md:pt-10 lg:min-h-[calc(100svh-4rem)] lg:pb-8">
            <div className="text-center md:text-left">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sage-light px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-muted">
                14-day free trial · White-glove setup included
              </div>
              <h1 className="font-serif text-[1.65rem] font-semibold leading-[1.12] tracking-tight text-ink sm:text-[2rem] md:text-[2.35rem] lg:text-[2.65rem]">
                Stop losing leads you already paid for.
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-[15px] leading-snug text-slate-text md:mx-0 md:text-[16px]">
                {BRAND_NAME} keeps real estate leads organized, follows up consistently, and shows
                agents who needs attention next.
              </p>
              <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row md:justify-start">
                <PrimaryCta className="w-full sm:w-auto" />
                <a
                  href="#demo"
                  className="text-[14px] font-semibold text-rose-gold-deep underline-offset-4 hover:underline"
                >
                  Watch 60-sec demo
                </a>
              </div>
            </div>
            <div className="mx-auto w-full max-w-lg md:max-w-none">
              <DashboardPreview />
            </div>
          </div>
        </section>

        {/* ── Proof strip ── */}
        <section className="border-y border-outline-variant/15 bg-ivory py-8">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-4 px-4 text-center md:gap-x-12">
            <div>
              <p className="font-serif text-[22px] font-semibold text-ink">14 days</p>
              <p className="text-[12px] text-taupe">Free trial</p>
            </div>
            <div className="hidden h-8 w-px bg-outline-variant/30 sm:block" />
            <div>
              <p className="font-serif text-[22px] font-semibold text-ink">We set it up</p>
              <p className="text-[12px] text-taupe">White-glove onboarding</p>
            </div>
            <div className="hidden h-8 w-px bg-outline-variant/30 sm:block" />
            <div>
              <p className="font-serif text-[22px] font-semibold text-ink">TCPA ready</p>
              <p className="text-[12px] text-taupe">Consent + DNC built in</p>
            </div>
            {TESTIMONIALS_PENDING ? (
              <>
                <div className="hidden h-8 w-px bg-outline-variant/30 lg:block" />
                <p className="text-[12px] italic text-taupe">
                  Verified agent testimonials coming soon
                </p>
              </>
            ) : null}
          </div>
        </section>

        {/* ── 2. Three benefits ── */}
        <section id="benefits" className="py-20 md:py-24">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="mb-12 text-center">
              <h2 className="font-serif text-headline-lg-mobile font-semibold text-ink md:text-headline-lg">
                Built for agents who can&apos;t afford to drop the ball
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {BENEFITS.map((b) => (
                <article
                  key={b.title}
                  className="rounded-[28px] border border-outline-variant/15 bg-ivory p-8 shadow-card"
                >
                  <span className="material-symbols-outlined mb-4 text-[32px] text-rose-gold-deep">
                    {b.icon}
                  </span>
                  <h3 className="mb-3 font-serif text-[20px] font-semibold text-ink">{b.title}</h3>
                  <p className="text-[14px] leading-relaxed text-slate-text">{b.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Product demo walkthrough ── */}
        <section id="demo" className="bg-ivory py-20 md:py-24">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="mb-10 text-center">
              <p className="text-label-md font-semibold uppercase tracking-widest text-rose-gold-deep">
                60-second walkthrough
              </p>
              <h2 className="mt-3 font-serif text-headline-lg-mobile font-semibold text-ink md:text-headline-lg">
                Lead → follow-up → response → your next action
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {DEMO_STEPS.map((step, i) => (
                <div
                  key={step.label}
                  className="relative rounded-2xl border border-outline-variant/15 bg-cream p-5"
                >
                  <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-rose-gold text-[13px] font-bold text-ivory">
                    {i + 1}
                  </span>
                  <p className="font-semibold text-ink">{step.label}</p>
                  <p className="mt-1 text-[13px] text-slate-text">{step.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex justify-center">
              <PrimaryCta />
            </div>
          </div>
        </section>

        {/* ── How ARI works ── */}
        <section className="py-20 md:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center md:px-8">
            <h2 className="font-serif text-headline-lg-mobile font-semibold text-ink md:text-headline-lg">
              How {BRAND_NAME} works
            </h2>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {HOW_IT_WORKS.map((item) => (
                <div key={item.step}>
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border-2 border-rose-gold font-serif text-[20px] font-semibold text-rose-gold-deep">
                    {item.step}
                  </div>
                  <h3 className="mb-2 text-[17px] font-semibold text-ink">{item.title}</h3>
                  <p className="text-[14px] leading-relaxed text-slate-text">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trust: white-glove offer ── */}
        <section className="border-y border-outline-variant/15 bg-rose-gold-deep py-12">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 text-center md:flex-row md:justify-between md:text-left">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ivory/70">
                Included on every plan
              </p>
              <p className="mt-1 font-serif text-[22px] font-semibold text-ivory md:text-[26px]">
                14-day free trial + we set it up for you
              </p>
              <p className="mt-2 text-[14px] text-ivory/85">
                Import leads, configure follow-up, and train your team — no DIY required.
              </p>
            </div>
            <PrimaryCta className="shrink-0 !bg-ivory !text-ink hover:!opacity-90" />
          </div>
        </section>

        {/* ── Pricing — Growth featured, one clear winner ── */}
        <section id="pricing" className="bg-ivory py-20 md:py-24">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="text-center">
              <p className="text-label-md font-semibold uppercase tracking-widest text-rose-gold-deep">
                Simple pricing
              </p>
              <h2 className="mt-3 font-serif text-headline-lg-mobile font-semibold text-ink md:text-headline-lg">
                Start free. Scale when you&apos;re ready.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-[14px] text-slate-text">
                Annual billing saves ~2 months. SMS &amp; RVM metered with transparent overages.
              </p>
            </div>

            {/* Recommended plan — hero card */}
            <article className="relative mx-auto mt-12 max-w-lg overflow-hidden rounded-[32px] border-4 border-rose-gold bg-rose-gold-deep p-8 text-ivory shadow-card md:p-10">
              <span className="absolute -top-0 left-1/2 -translate-x-1/2 rounded-b-xl bg-rose-gold px-6 py-1.5 text-[11px] font-bold uppercase tracking-widest text-ivory">
                Most popular
              </span>
              <div className="pt-4 text-center">
                <h3 className="font-serif text-[28px] font-semibold">{growthPlan.name}</h3>
                <p className="mt-1 text-ivory/80">{growthPlan.description}</p>
                <div className="mt-6 flex items-baseline justify-center gap-1">
                  <span className="font-serif text-[48px] font-semibold leading-none">
                    ${growthPlan.price}
                  </span>
                  <span className="text-ivory/70">/mo</span>
                </div>
                <Link
                  href={SIGN_UP}
                  className="mt-8 block w-full rounded-full bg-rose-gold py-4 text-center text-[15px] font-bold text-ivory shadow-card hover:opacity-95"
                >
                  {PRIMARY_CTA}
                </Link>
                <ul className="mt-8 space-y-3 text-left text-[14px] text-ivory/90">
                  {growthPlan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircleIcon className="mt-0.5 shrink-0 text-sage-light" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            {/* Other tiers — compact row */}
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {PLAN_OPTIONS.filter((p) => !p.featured).map((plan) => (
                <article
                  key={plan.id}
                  className="flex flex-col rounded-2xl border border-outline-variant/15 bg-cream p-6"
                >
                  <h3 className="font-serif text-[20px] font-semibold text-ink">{plan.name}</h3>
                  <p className="mt-1 text-[13px] text-taupe">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1 text-ink">
                    {plan.priceFrom ? (
                      <span className="text-[13px] text-taupe">From</span>
                    ) : null}
                    <span className="font-serif text-[32px] font-semibold">${plan.price}</span>
                    <span className="text-taupe">/mo</span>
                  </div>
                  <ul className="mt-4 flex-1 space-y-2 text-[12px] text-slate-text">
                    {plan.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-start gap-1.5">
                        <span className="material-symbols-outlined mt-0.5 text-[14px] text-rose-gold-deep">
                          check
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {plan.contactSales ? (
                    <a
                      href={`mailto:${SALES_EMAIL}?subject=ARI Team Plan`}
                      className="mt-5 block rounded-full border border-rose-gold py-2.5 text-center text-[13px] font-semibold text-rose-gold-deep hover:bg-rose-gold/10"
                    >
                      {plan.cta}
                    </a>
                  ) : (
                    <Link
                      href={SIGN_UP}
                      className="mt-5 block rounded-full border border-rose-gold py-2.5 text-center text-[13px] font-semibold text-rose-gold-deep hover:bg-rose-gold/10"
                    >
                      {PRIMARY_CTA}
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <LandingFaq />

        {/* ── Final CTA — single action only ── */}
        <section className="px-4 py-20 md:px-8">
          <div className="mx-auto max-w-3xl rounded-[40px] bg-rose-gold-deep px-8 py-14 text-center md:py-16">
            <h2 className="font-serif text-[28px] font-semibold text-ivory md:text-[34px]">
              Your next lead is already out there.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[15px] text-ivory/85">
              Start your 14-day free trial. We&apos;ll set up your CRM and first follow-up sequence
              — you focus on closing.
            </p>
            <PrimaryCta className="mt-8 !bg-ivory !px-12 !py-4 !text-[15px] !text-ink" />
          </div>
        </section>
      </main>

      <footer id="company" className="border-t border-outline-variant/15 bg-ivory py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="mb-12 grid gap-10 md:grid-cols-4">
            <div>
              <AriLogo height={40} className="mb-3" />
              <p className="text-[13px] italic text-taupe">{BRAND_TAGLINE}</p>
              <a
                href={BRAND_URL}
                className="mt-2 block text-[13px] font-medium text-rose-gold-deep hover:underline"
              >
                {BRAND_DOMAIN}
              </a>
            </div>
            <div>
              <h4 className="mb-4 text-[12px] font-bold uppercase tracking-widest text-ink">
                Product
              </h4>
              <ul className="space-y-2 text-[14px] text-slate-text">
                <li>
                  <a href="#benefits" className="hover:text-rose-gold-deep">
                    Benefits
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-rose-gold-deep">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-rose-gold-deep">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-[12px] font-bold uppercase tracking-widest text-ink">
                Legal
              </h4>
              <ul className="space-y-2 text-[14px] text-slate-text">
                <li>
                  <Link href="/privacy" className="hover:text-rose-gold-deep">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/sms-consent" className="hover:text-rose-gold-deep">
                    SMS Consent
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-[12px] font-bold uppercase tracking-widest text-ink">
                Contact
              </h4>
              <a
                href={`mailto:${SALES_EMAIL}`}
                className="text-[14px] text-slate-text hover:text-rose-gold-deep"
              >
                {SALES_EMAIL}
              </a>
            </div>
          </div>
          <p className="border-t border-outline-variant/20 pt-8 text-center text-[12px] text-taupe">
            © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved. · TCPA · FCC · DNC ready
          </p>
        </div>
      </footer>
    </div>
  );
}
