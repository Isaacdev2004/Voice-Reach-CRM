import Image from "next/image";
import Link from "next/link";
import { AriLogo } from "@/components/brand/ari-logo";
import { DemoVideo } from "@/components/landing/demo-video";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFoundingOffer } from "@/components/landing/landing-founding-offer";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingTestimonials } from "@/components/landing/landing-testimonials";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { BRAND_DOMAIN, BRAND_NAME, BRAND_TAGLINE, BRAND_URL } from "@/lib/brand";
import { FOUNDING_100 } from "@/lib/marketing/founding";

const SIGN_UP = "/sign-up";
const SALES_EMAIL = "hello@myari.io";
const DASHBOARD_IMAGE = "/brand/ari-dashboard-hero.png";

const HERO_BULLETS = [
  "Every lead organized in one CRM — no spreadsheets, no sticky notes",
  "Automatic follow-up via SMS, email, and ringless voicemail",
  "Your dashboard shows exactly who to contact next",
];

const PROBLEM_CARDS = [
  {
    num: "1",
    title: "Leads slip through the cracks",
    body: "Inquiries sit in email, Zillow, and your phone. Without a system, hot buyers go cold before you call back.",
  },
  {
    num: "2",
    title: "Follow-up is inconsistent",
    body: "You mean to reach out — but showings, closings, and life get in the way. Prospects choose the agent who responds first.",
  },
  {
    num: "3",
    title: "No clear priority list",
    body: "You waste time guessing who to call. ARI ranks leads by stage, reply, and overdue tasks so you always know what's next.",
  },
];

const FEATURE_CARDS = [
  {
    icon: "notifications_active",
    title: "Instant lead alerts",
    body: "New inquiry? ARI captures it, tags the source, and triggers your first touch within minutes.",
  },
  {
    icon: "schedule_send",
    title: "Follow-up on autopilot",
    body: "Multi-step campaigns run while you're in showings — day 1, 3, and 7 sequences built for real estate.",
  },
  {
    icon: "forum",
    title: "Every reply in one place",
    body: "SMS and email responses land on the contact record. No switching apps to see who wrote back.",
  },
  {
    icon: "person_pin",
    title: "Know who to call next",
    body: "Hot leads, overdue tasks, and fresh replies surface on your dashboard the moment you log in.",
  },
];

const HOW_IT_WORKS = [
  {
    icon: "upload",
    title: "Connect your leads",
    body: "Import contacts, connect lead sources, or add manually. ARI stages every prospect.",
  },
  {
    icon: "auto_awesome",
    title: "ARI follows up",
    body: "Automated sequences nurture leads compliantly — SMS, email, and ringless voicemail.",
  },
  {
    icon: "handshake",
    title: "You close",
    body: "When someone replies or goes hot, ARI puts them at the top of your list. You take the conversation from there.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      {/* ── Header ── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-outline-variant/15 bg-ivory/95 backdrop-blur-md">
        <nav className="landing-shell flex h-14 items-center justify-between md:h-[4.25rem]">
          <Link href="/" aria-label={`${BRAND_NAME} home`}>
            <AriLogo height={48} />
          </Link>
          <div className="hidden items-center gap-10 md:flex">
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
          <div className="flex items-center gap-4">
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
        {/* ── Hero ── */}
        <section className="hero-gradient">
          <div className="landing-shell grid items-center gap-10 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] md:gap-10 md:py-16 lg:gap-14 lg:py-20 xl:gap-16">
            <div className="max-w-[36rem] md:max-w-none">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-gold-deep md:text-[12px]">
                {FOUNDING_100.name} · {FOUNDING_100.trialDays}-day free trial · White-glove setup
              </p>
              <h1 className="font-serif text-[2.125rem] font-semibold leading-[1.08] tracking-tight text-ink sm:text-[2.5rem] md:text-[3rem] lg:text-[3.375rem] xl:text-[3.625rem]">
                Stop losing leads you already paid for.
              </h1>
              <p className="mt-5 text-[16px] font-medium leading-relaxed text-ink/80 md:text-[17px] lg:text-[18px] lg:leading-[1.55]">
                {FOUNDING_100.positioning} {BRAND_NAME} organizes your leads, follows up
                automatically, and shows you who to contact next.
              </p>
              <ul className="mt-6 space-y-3 md:mt-7">
                {HERO_BULLETS.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-[15px] leading-snug text-slate-text md:text-[16px] lg:text-[17px]"
                  >
                    <span className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-rose-gold-deep md:text-[22px]">
                      check_circle
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-5 md:mt-10">
                <StartFreeButton
                  location="hero"
                  className="!px-10 !py-3.5 !text-[14px] md:!px-12 md:!py-4 md:!text-[15px]"
                />
                <a
                  href="#demo"
                  className="text-[15px] font-semibold text-rose-gold-deep underline-offset-4 hover:underline md:text-[16px]"
                >
                  See ARI in action
                </a>
              </div>
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

        <DemoVideo />

        {/* ── Proof strip ── */}
        <section className="border-y border-outline-variant/10 bg-ivory py-8 md:py-10">
          <div className="landing-shell text-center">
            <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe md:text-[12px]">
              Built for real estate professionals
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-[14px] font-semibold tracking-wide text-ink/35 md:text-[15px]">
              <span>TCPA compliant</span>
              <span className="hidden sm:inline text-ink/15">·</span>
              <span>Ringless voicemail</span>
              <span className="hidden sm:inline text-ink/15">·</span>
              <span>Multi-channel CRM</span>
              <span className="hidden sm:inline text-ink/15">·</span>
              <span>White-glove onboarding</span>
            </div>
          </div>
        </section>

        {/* ── Problem / why ARI ── */}
        <section id="benefits" className="py-16 md:py-20 lg:py-24">
          <div className="landing-shell">
            <h2 className="text-center font-serif text-[28px] font-semibold text-ink md:text-[36px] lg:text-[40px]">
              Built for agents who can&apos;t afford to drop the ball
            </h2>
            <div className="mt-12 grid gap-8 md:mt-14 md:grid-cols-3 lg:gap-10">
              {PROBLEM_CARDS.map((card) => (
                <article key={card.num} className="text-center md:text-left">
                  <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-rose-gold/15 font-serif text-[20px] font-semibold text-rose-gold-deep md:mx-0 lg:h-14 lg:w-14 lg:text-[22px]">
                    {card.num}
                  </div>
                  <h3 className="mb-3 font-serif text-[20px] font-semibold text-ink lg:text-[22px]">{card.title}</h3>
                  <p className="text-[15px] leading-relaxed text-slate-text lg:text-[16px]">{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features + demo anchor ── */}
        <section id="features" className="bg-ivory py-16 md:py-20 lg:py-24">
          <div className="landing-shell">
            <div className="mx-auto max-w-[40rem] text-center lg:max-w-[44rem]">
              <h2 className="font-serif text-[28px] font-semibold text-ink md:text-[36px] lg:text-[40px]">
                Lead follow-up on autopilot — so you close more deals
              </h2>
              <p className="mt-4 text-[16px] text-slate-text lg:text-[17px]">
                Everything a producing agent needs: CRM, campaigns, compliance, and a dashboard that
                tells you who to call next.
              </p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 md:mt-14 lg:gap-6">
              {FEATURE_CARDS.map((f) => (
                <article
                  key={f.title}
                  className="rounded-2xl border border-outline-variant/10 bg-cream p-6 md:p-7 lg:p-8"
                >
                  <span className="material-symbols-outlined mb-4 text-[30px] text-rose-gold-deep lg:text-[32px]">
                    {f.icon}
                  </span>
                  <h3 className="mb-2 font-serif text-[19px] font-semibold text-ink lg:text-[21px]">{f.title}</h3>
                  <p className="text-[15px] leading-relaxed text-slate-text lg:text-[16px]">{f.body}</p>
                </article>
              ))}
            </div>

            <div className="mt-12 flex justify-center">
              <StartFreeButton location="features" />
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="py-16 md:py-20 lg:py-24">
          <div className="landing-shell">
            <h2 className="text-center font-serif text-[28px] font-semibold text-ink md:text-[36px] lg:text-[40px]">
              How {BRAND_NAME} works
            </h2>
            <div className="mt-12 grid gap-10 md:mt-14 md:grid-cols-3 md:gap-8 lg:gap-10">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={step.title} className="relative text-center">
                  {i < HOW_IT_WORKS.length - 1 ? (
                    <span
                      className="absolute left-[calc(50%+2rem)] top-6 hidden h-px w-[calc(100%-4rem)] bg-outline-variant/25 md:block"
                      aria-hidden
                    />
                  ) : null}
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-gold/10">
                    <span className="material-symbols-outlined text-[28px] text-rose-gold-deep">
                      {step.icon}
                    </span>
                  </div>
                  <h3 className="mb-2 font-serif text-[19px] font-semibold text-ink lg:text-[21px]">{step.title}</h3>
                  <p className="text-[15px] leading-relaxed text-slate-text lg:text-[16px]">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <LandingFoundingOffer />

        <LandingTestimonials />

        {/* ── Mid-page CTA banner ── */}
        <section className="bg-rose-gold-deep py-10 md:py-12 lg:py-14">
          <div className="landing-shell flex flex-col items-center justify-between gap-5 md:flex-row md:gap-8">
            <div className="text-center md:text-left">
              <p className="font-serif text-[24px] font-semibold text-ivory md:text-[28px] lg:text-[30px]">
                14-day free trial + we set it up for you
              </p>
              <p className="mt-2 text-[15px] text-ivory/85 md:text-[16px]">
                Import leads, configure follow-up, and go live — no DIY required.
              </p>
            </div>
            <StartFreeButton variant="light" className="shrink-0" location="mid-cta" />
          </div>
        </section>

        <LandingPricing />

        <LandingFaq />

        {/* ── Final CTA ── */}
        <section className="py-16 md:py-20 lg:py-24">
          <div className="landing-shell">
            <div className="rounded-[36px] bg-rose-gold-deep px-8 py-14 text-center md:px-12 md:py-16 lg:py-[4.5rem]">
            <h2 className="font-serif text-[28px] font-semibold text-ivory md:text-[34px] lg:text-[38px]">
              Your next lead is already out there.
            </h2>
            <p className="mx-auto mt-4 w-full max-w-[36rem] px-2 text-[16px] leading-relaxed text-ivory/85 lg:text-[17px]">
              Start free today. We&apos;ll organize your pipeline and turn on follow-up — you focus
              on closing.
            </p>
            <StartFreeButton variant="light" className="mt-8 !px-12 !py-4" location="final-cta" />
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-outline-variant/15 bg-ivory py-16">
        <div className="landing-shell">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-1">
              <AriLogo height={36} />
              <p className="mt-3 text-[13px] italic text-taupe">{BRAND_TAGLINE}</p>
              <a
                href={BRAND_URL}
                className="mt-1 block text-[13px] font-medium text-rose-gold-deep hover:underline"
              >
                {BRAND_DOMAIN}
              </a>
            </div>
            <div>
              <h4 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-ink">
                Product
              </h4>
              <ul className="space-y-2.5 text-[14px] text-slate-text">
                <li>
                  <a href="#features" className="hover:text-rose-gold-deep">
                    Platform
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-rose-gold-deep">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-rose-gold-deep">
                    How it works
                  </a>
                </li>
                <li>
                  <Link href={SIGN_UP} className="hover:text-rose-gold-deep">
                    Start Free
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-ink">
                {BRAND_NAME}
              </h4>
              <ul className="space-y-2.5 text-[14px] text-slate-text">
                <li>
                  <Link href="/contact" className="hover:text-rose-gold-deep">
                    Contact
                  </Link>
                </li>
                <li>
                  <a href="#faq" className="hover:text-rose-gold-deep">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-ink">
                Legal
              </h4>
              <ul className="space-y-2.5 text-[14px] text-slate-text">
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
          </div>
          <p className="mt-12 border-t border-outline-variant/15 pt-8 text-center text-[12px] text-taupe">
            © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
