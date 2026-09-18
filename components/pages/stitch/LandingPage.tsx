import Image from "next/image";
import Link from "next/link";
import { AriLogo } from "@/components/brand/ari-logo";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { BRAND_DOMAIN, BRAND_NAME, BRAND_TAGLINE, BRAND_URL } from "@/lib/brand";

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

function StartFreeButton({
  className = "",
  variant = "primary",
}: {
  className?: string;
  variant?: "primary" | "light" | "outline";
}) {
  const styles =
    variant === "light"
      ? "bg-ivory text-ink hover:opacity-95"
      : variant === "outline"
        ? "border-2 border-rose-gold bg-transparent text-rose-gold-deep hover:bg-rose-gold/5"
        : "bg-rose-gold text-ivory shadow-card hover:opacity-95";

  return (
    <Link
      href={SIGN_UP}
      className={`inline-flex items-center justify-center rounded-full px-8 py-3 text-[14px] font-bold uppercase tracking-wide transition-all active:scale-[0.98] ${styles} ${className}`}
    >
      Start Free
    </Link>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      {/* ── Header ── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-outline-variant/15 bg-ivory/95 backdrop-blur-md">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:h-16 md:px-8">
          <Link href="/" aria-label={`${BRAND_NAME} home`}>
            <AriLogo height={44} />
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-[14px] text-ink/70 hover:text-rose-gold-deep">
              Platform
            </a>
            <a href="#pricing" className="text-[14px] text-ink/70 hover:text-rose-gold-deep">
              Pricing
            </a>
            <a href="#how-it-works" className="text-[14px] text-ink/70 hover:text-rose-gold-deep">
              How it works
            </a>
            <a href="#faq" className="text-[14px] text-ink/70 hover:text-rose-gold-deep">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="hidden text-[14px] font-medium text-ink/75 hover:text-ink sm:block"
            >
              Log in
            </Link>
            <StartFreeButton className="!px-5 !py-2 !text-[12px]" />
          </div>
        </nav>
      </header>

      <main className="pt-14 md:pt-16">
        {/* ── Hero ── */}
        <section className="bg-cream">
          <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:gap-12 md:px-8 md:py-14 lg:min-h-[calc(100svh-4rem)] lg:py-16">
            <div>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-gold-deep">
                14-day free trial · White-glove setup
              </p>
              <h1 className="font-serif text-[2rem] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[2.35rem] lg:text-[2.75rem]">
                Stop losing leads you already paid for.
              </h1>
              <p className="mt-4 text-[15px] font-medium text-ink/80">
                {BRAND_NAME} keeps real estate leads organized, follows up consistently, and shows
                agents who needs attention next.
              </p>
              <ul className="mt-5 space-y-2.5">
                {HERO_BULLETS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[14px] text-slate-text">
                    <span className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-rose-gold-deep">
                      check_circle
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <StartFreeButton />
                <a
                  href="#demo"
                  className="text-[14px] font-semibold text-rose-gold-deep underline-offset-4 hover:underline"
                >
                  Watch 60-sec demo
                </a>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-xl md:max-w-none">
              <div className="overflow-hidden rounded-2xl border border-outline-variant/15 shadow-[0_20px_60px_rgba(26,20,16,0.12)]">
                <Image
                  src={DASHBOARD_IMAGE}
                  alt="ARI CRM dashboard showing contacts, tasks, and marketing pulse on desktop"
                  width={1200}
                  height={900}
                  className="h-auto w-full object-cover object-top"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Proof strip ── */}
        <section className="border-y border-outline-variant/10 bg-ivory py-8">
          <div className="mx-auto max-w-5xl px-4 text-center">
            <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
              Built for real estate professionals
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-[13px] font-semibold tracking-wide text-ink/30">
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
        <section id="benefits" className="py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <h2 className="text-center font-serif text-[26px] font-semibold text-ink md:text-[34px]">
              Built for agents who can&apos;t afford to drop the ball
            </h2>
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {PROBLEM_CARDS.map((card) => (
                <article key={card.num} className="text-center md:text-left">
                  <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-rose-gold/15 font-serif text-[20px] font-semibold text-rose-gold-deep md:mx-0">
                    {card.num}
                  </div>
                  <h3 className="mb-3 font-serif text-[19px] font-semibold text-ink">{card.title}</h3>
                  <p className="text-[14px] leading-relaxed text-slate-text">{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features + demo anchor ── */}
        <section id="features" className="bg-ivory py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-serif text-[26px] font-semibold text-ink md:text-[34px]">
                Lead follow-up on autopilot — so you close more deals
              </h2>
              <p className="mt-4 text-[15px] text-slate-text">
                Everything a producing agent needs: CRM, campaigns, compliance, and a dashboard that
                tells you who to call next.
              </p>
            </div>
            <div className="mt-14 grid gap-5 sm:grid-cols-2">
              {FEATURE_CARDS.map((f) => (
                <article
                  key={f.title}
                  className="rounded-2xl border border-outline-variant/10 bg-cream p-6 md:p-7"
                >
                  <span className="material-symbols-outlined mb-4 text-[28px] text-rose-gold-deep">
                    {f.icon}
                  </span>
                  <h3 className="mb-2 font-serif text-[18px] font-semibold text-ink">{f.title}</h3>
                  <p className="text-[14px] leading-relaxed text-slate-text">{f.body}</p>
                </article>
              ))}
            </div>

            {/* Demo walkthrough */}
            <div id="demo" className="mt-16 scroll-mt-24">
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-gold-deep">
                60-second product demo
              </p>
              <h3 className="mt-2 text-center font-serif text-[22px] font-semibold text-ink md:text-[26px]">
                Lead → follow-up → response → next action
              </h3>
              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  "New lead captured from Zillow or your site",
                  "Day 1 + 3 follow-up sends automatically",
                  "Prospect replies — tracked on contact record",
                  "Dashboard flags them Hot — you call and close",
                ].map((step, i) => (
                  <div
                    key={step}
                    className="flex items-start gap-3 rounded-xl border border-outline-variant/10 bg-ivory p-4"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-gold text-[12px] font-bold text-ivory">
                      {i + 1}
                    </span>
                    <p className="text-[13px] leading-snug text-slate-text">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 flex justify-center">
              <StartFreeButton />
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="py-20 md:py-28">
          <div className="mx-auto max-w-5xl px-4 md:px-8">
            <h2 className="text-center font-serif text-[26px] font-semibold text-ink md:text-[34px]">
              How {BRAND_NAME} works
            </h2>
            <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
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
                  <h3 className="mb-2 font-serif text-[18px] font-semibold text-ink">{step.title}</h3>
                  <p className="text-[14px] leading-relaxed text-slate-text">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Mid-page CTA banner ── */}
        <section className="bg-rose-gold-deep py-10 md:py-12">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-5 px-4 md:flex-row md:px-8">
            <div className="text-center md:text-left">
              <p className="font-serif text-[22px] font-semibold text-ivory md:text-[26px]">
                14-day free trial + we set it up for you
              </p>
              <p className="mt-1 text-[14px] text-ivory/80">
                Import leads, configure follow-up, and go live — no DIY required.
              </p>
            </div>
            <StartFreeButton variant="light" className="shrink-0" />
          </div>
        </section>

        <LandingPricing />

        <LandingFaq />

        {/* ── Final CTA ── */}
        <section className="px-4 py-20 md:px-8 md:py-24">
          <div className="mx-auto max-w-3xl rounded-[36px] bg-rose-gold-deep px-8 py-14 text-center md:py-16">
            <h2 className="font-serif text-[26px] font-semibold text-ivory md:text-[32px]">
              Your next lead is already out there.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[15px] text-ivory/85">
              Start free today. We&apos;ll organize your pipeline and turn on follow-up — you focus
              on closing.
            </p>
            <StartFreeButton variant="light" className="mt-8 !px-12 !py-4" />
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-outline-variant/15 bg-ivory py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
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
                  <a href={`mailto:${SALES_EMAIL}`} className="hover:text-rose-gold-deep">
                    Contact
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
