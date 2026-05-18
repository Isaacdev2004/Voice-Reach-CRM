import Image from "next/image";
import Link from "next/link";
import {
  AutomationIcon,
  CheckCircleIcon,
  FeatureIconBadge,
  HubIcon,
  ShieldCheckIcon,
  VerifiedBadgeIcon,
  VoicemailIcon,
} from "@/components/icons/landing-icons";

const PARTNERS = [
  "Northgate Realty",
  "Summit Lending",
  "Atlas Insurance",
  "Harbor Solar",
];

const PRICING_TIERS = [
  {
    name: "Growth",
    description: "For emerging teams",
    price: "$99",
    priceSuffix: "/mo",
    cta: "Get Started",
    ctaStyle: "outline" as const,
    features: [
      "5,000 deliveries / month",
      "Basic CRM integration",
      "TCPA scrubbing",
      "Email support",
    ],
  },
  {
    name: "Scale",
    description: "For high-velocity operations",
    price: "$249",
    priceSuffix: "/mo",
    cta: "Get Pro Access",
    ctaStyle: "primary" as const,
    featured: true,
    features: [
      "25,000 deliveries / month",
      "Advanced automation",
      "Priority AI routing",
      "Dedicated success manager",
    ],
  },
  {
    name: "Elite",
    description: "Custom enterprise needs",
    price: "Custom",
    priceSuffix: "",
    cta: "Talk to Sales",
    ctaStyle: "outline" as const,
    features: [
      "Unlimited deliveries",
      "Dedicated compliance officer",
      "White-label CRM options",
      "Custom API & SLAs",
    ],
  },
];

const VOICEMAIL_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA4mY1HqyEWkMw4eP-V9ZXnHoPW63iJJ3NTQDKCE-y5YFQMLLLiFQdBL1CtAFg-W-rkiilQ8QhbkG6I3uZ2Y9fj193cXJE79WpYSXk2x5Dmkh696UFgMxOTooDa4iC9PoHFbuUEFyDvPGiTlSXVSlnIqpI0CKyd0isXXU66rwSZFH2hkNkMc3cWzVQL0ELouIZCNVl1VvfQdjeo6nRrmviLtIS-ZOB2AoxxT3LbE-ez53Sc6Y0VyeM02wRnJHzZIrxUPCICNUIqUZNU";

const HUB_HIGHLIGHTS = [
  "Contacts, consent, and campaign history in one view",
  "Track replies without switching tools",
  "Launch workflows from any record",
];

const TRIGGER_HIGHLIGHTS = [
  "Follow up when a voicemail is listened",
  "React to CRM stage changes automatically",
  "Re-engage leads after 48 hours of silence",
];

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCrMYSFJrxHAztPMNmvB_CURIYTBfkInlF503KLzKOpjvHHO2L1BKo2XDlaXlDTUwk4Q1nUstj36OCWKIAOnBpJ5m0y8vEy8vGpUf2ZNoHoQuPSX-EWp-KeRfEKyei8GI2gFrsomazbwBHROwIoG0L8e186MMKSHEC2B0SJ-RMzadp01TzRBAGRWvuDhVR4HCYoPLa8ntJQFsj63XnzOHhqtMx33TEsfToD3lnUhXkSp9F-I-Gn53xbOmZiOGv3Li31SUrBE8W2KAYf";

export function LandingPage() {
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-outline-variant/30 bg-surface/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-margin-mobile md:px-margin-desktop">
          <Link href="/" className="text-headline-md font-black tracking-tight text-ink">
            Voice Reach CRM
          </Link>
          <div className="hidden items-center gap-lg md:flex">
            <a
              href="#features"
              className="text-label-md font-semibold text-secondary transition-colors hover:text-secondary/80"
            >
              Solutions
            </a>
            <a
              href="#pricing"
              className="text-label-md font-medium text-slate-text transition-colors hover:text-secondary"
            >
              Pricing
            </a>
            <a
              href="#compliance"
              className="text-label-md font-medium text-slate-text transition-colors hover:text-secondary"
            >
              Compliance
            </a>
          </div>
          <div className="flex items-center gap-sm">
            <Link
              href="/sign-in"
              className="hidden rounded-full px-4 py-2 text-label-md font-medium text-slate-text transition-colors hover:bg-surface-container-low sm:block"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-primary px-6 py-2.5 text-label-md font-semibold text-on-primary shadow-sm transition-all hover:bg-on-primary-fixed-variant active:scale-95"
            >
              Start Free Trial
            </Link>
          </div>
        </nav>
      </header>

      <main className="pt-16">
        {/* Hero */}
        <section className="hero-gradient relative overflow-hidden py-20 md:py-28">
          <div className="relative z-10 mx-auto max-w-7xl px-margin-mobile text-center md:px-margin-desktop">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-on-tertiary-container/10 px-4 py-1.5 text-caption font-semibold uppercase tracking-wider text-on-tertiary-container">
              <VerifiedBadgeIcon className="text-on-tertiary-container" />
              FCC &amp; TCPA compliant platform
            </div>
            <h1 className="mx-auto mb-6 max-w-4xl text-headline-lg-mobile font-semibold tracking-tight text-ink md:text-display-lg md:leading-[1.1]">
              Automate ringless voicemail campaigns with{" "}
              <span className="text-secondary">built-in CRM</span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-body-lg text-slate-text">
              Reach thousands of prospects without ringing their phones. One platform for
              consent tracking, campaign delivery, and high-conversion outbound workflows.
            </p>
            <div className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/sign-up"
                className="w-full rounded-full bg-primary px-10 py-4 text-label-md font-semibold text-on-primary shadow-xl transition-all hover:shadow-2xl active:scale-95 sm:w-auto"
              >
                Start Free Trial
              </Link>
              <a
                href="#pricing"
                className="w-full rounded-full border border-outline-variant bg-surface px-10 py-4 text-label-md font-semibold text-ink transition-colors hover:bg-surface-container-low sm:w-auto"
              >
                View Pricing
              </a>
            </div>
            <div className="relative mx-auto max-w-5xl">
              <div className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-white p-2 shadow-2xl">
                <Image
                  src={HERO_IMAGE}
                  alt="Voice Reach CRM dashboard showing campaign analytics"
                  width={1200}
                  height={675}
                  className="h-auto w-full rounded-xl"
                  priority
                />
              </div>
              <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-secondary-container/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-on-tertiary-container/10 blur-3xl" />
            </div>
          </div>
        </section>

        {/* Social proof */}
        <section className="border-b border-outline-variant/20 bg-white py-12">
          <div className="mx-auto max-w-7xl px-margin-mobile md:px-margin-desktop">
            <p className="mb-8 text-center text-label-md font-semibold uppercase tracking-[0.2em] text-slate-text">
              Trusted by growth teams in regulated industries
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 md:gap-x-14">
              {PARTNERS.map((name) => (
                <li
                  key={name}
                  className="text-label-md font-semibold tracking-tight text-ink/40 transition-colors hover:text-ink/60"
                >
                  {name}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-surface py-24">
          <div className="mx-auto max-w-7xl px-margin-mobile md:px-margin-desktop">
            <div className="mb-16 max-w-2xl">
              <p className="mb-3 text-label-md font-semibold uppercase tracking-widest text-secondary">
                Platform capabilities
              </p>
              <h2 className="mb-4 text-headline-lg-mobile font-semibold text-ink md:text-headline-lg">
                Precision workflow automation
              </h2>
              <p className="text-body-lg text-slate-text">
                Everything you need to scale outreach without adding headcount—built for
                teams that cannot compromise on compliance.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-gutter md:grid-cols-12 md:items-stretch">
              <article className="group relative flex flex-col overflow-hidden rounded-[32px] border border-outline-variant/30 bg-white shadow-sm md:col-span-8 md:min-h-[480px]">
                <div className="flex flex-1 flex-col gap-8 p-8 md:flex-row md:items-stretch md:gap-10 md:p-10">
                  <div className="flex flex-1 flex-col justify-center md:max-w-[42%]">
                    <FeatureIconBadge>
                      <VoicemailIcon />
                    </FeatureIconBadge>
                    <h3 className="mt-6 mb-4 text-headline-md font-semibold text-ink">
                      Ringless Voicemail Delivery
                    </h3>
                    <p className="text-body-md leading-relaxed text-slate-text">
                      Direct-to-voicemail technology that lands your message without ringing
                      the phone. Track delivery, listens, and callbacks in one place.
                    </p>
                  </div>
                  <div className="relative flex flex-1 items-end justify-center md:justify-end">
                    <div className="w-full overflow-hidden rounded-2xl border border-outline-variant/20 shadow-lg transition-transform duration-300 group-hover:scale-[1.02] md:-mb-4 md:-mr-4">
                      <Image
                        src={VOICEMAIL_IMAGE}
                        alt="Campaign delivery analytics dashboard"
                        width={800}
                        height={500}
                        className="h-auto w-full object-cover object-left-top"
                      />
                    </div>
                  </div>
                </div>
              </article>

              <article
                id="compliance"
                className="flex flex-col justify-center rounded-[32px] bg-primary-container p-8 shadow-xl md:col-span-4 md:p-10"
              >
                <FeatureIconBadge variant="dark">
                  <ShieldCheckIcon />
                </FeatureIconBadge>
                <h3 className="mt-6 mb-4 text-headline-md font-semibold text-on-primary">
                  Enterprise Compliance
                </h3>
                <p className="text-body-md leading-relaxed text-on-primary/80">
                  Native scrubbing for DNC, TCPA, and FCC rules with audit trails built for
                  high-volume outbound teams.
                </p>
                <ul className="mt-8 space-y-3">
                  {["Automatic DNC scrubbing", "Real-time STIR/SHAKEN"].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3 text-label-md text-on-primary"
                    >
                      <CheckCircleIcon className="shrink-0 text-on-tertiary-container" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>

              <div className="grid grid-cols-1 gap-gutter md:col-span-12 md:grid-cols-2">
                <article className="flex h-full flex-col rounded-[32px] border border-outline-variant/30 bg-white p-8 shadow-sm md:p-10">
                  <FeatureIconBadge>
                    <HubIcon />
                  </FeatureIconBadge>
                  <h3 className="mt-6 mb-3 text-headline-md font-semibold text-ink">
                    Centralized Hub
                  </h3>
                  <p className="mb-6 text-body-md leading-relaxed text-slate-text">
                    Manage leads, track responses, and run automations from one workspace tied to
                    every campaign.
                  </p>
                  <ul className="mt-auto space-y-3 border-t border-outline-variant/30 pt-6">
                    {HUB_HIGHLIGHTS.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-body-md text-slate-text"
                      >
                        <CheckCircleIcon className="mt-0.5 shrink-0 text-secondary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>

                <article className="flex h-full flex-col rounded-[32px] border border-outline-variant/30 bg-surface-container-low p-8 md:p-10">
                  <FeatureIconBadge>
                    <AutomationIcon />
                  </FeatureIconBadge>
                  <h3 className="mt-6 mb-3 text-headline-md font-semibold text-ink">
                    Smart Triggers
                  </h3>
                  <p className="mb-6 text-body-md leading-relaxed text-slate-text">
                    Automate follow-ups when prospects listen, change stage, or go quiet—no manual
                    chasing required.
                  </p>
                  <ul className="mt-auto space-y-3 border-t border-outline-variant/30 pt-6">
                    {TRIGGER_HIGHLIGHTS.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 text-body-md text-slate-text"
                      >
                        <CheckCircleIcon className="mt-0.5 shrink-0 text-secondary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-margin-mobile text-center md:px-margin-desktop">
            <p className="text-label-md font-semibold uppercase tracking-widest text-secondary">
              Transparent pricing
            </p>
            <h2 className="mt-4 mb-16 text-headline-lg-mobile font-semibold text-ink md:text-headline-lg">
              Scale as you grow
            </h2>
            <div className="grid grid-cols-1 items-stretch gap-8 md:grid-cols-3 md:items-center">
              {PRICING_TIERS.map((tier) => (
                <article
                  key={tier.name}
                  className={`relative flex flex-col rounded-[32px] p-8 text-left md:p-10 ${
                    tier.featured
                      ? "z-10 border-4 border-secondary-container bg-primary-container text-on-primary shadow-2xl md:scale-105"
                      : "border border-outline-variant/40 bg-surface-container-lowest hover:shadow-xl"
                  }`}
                >
                  {tier.featured && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-6 py-1 text-caption font-bold uppercase tracking-widest text-white">
                      Most popular
                    </span>
                  )}
                  <h3
                    className={`mb-2 text-headline-md font-semibold ${
                      tier.featured ? "text-on-primary" : "text-ink"
                    }`}
                  >
                    {tier.name}
                  </h3>
                  <p
                    className={`mb-8 text-body-md ${
                      tier.featured ? "text-on-primary/80" : "text-slate-text"
                    }`}
                  >
                    {tier.description}
                  </p>
                  <div
                    className={`mb-8 flex items-baseline gap-1 ${
                      tier.featured ? "text-on-primary" : "text-ink"
                    }`}
                  >
                    <span className="text-display-lg font-semibold leading-none">
                      {tier.price}
                    </span>
                    {tier.priceSuffix && (
                      <span
                        className={`text-headline-md ${
                          tier.featured ? "text-on-primary/70" : "text-slate-text"
                        }`}
                      >
                        {tier.priceSuffix}
                      </span>
                    )}
                  </div>
                  <Link
                    href="/sign-up"
                    className={`mb-10 w-full rounded-full py-4 text-center text-label-md font-bold transition-all ${
                      tier.ctaStyle === "primary"
                        ? "bg-secondary text-white shadow-lg hover:bg-secondary/90"
                        : tier.featured
                          ? "border border-on-primary/30 text-on-primary hover:bg-on-primary/10"
                          : "border border-primary text-primary hover:bg-primary hover:text-on-primary"
                    }`}
                  >
                    {tier.cta}
                  </Link>
                  <ul className="mt-auto space-y-4">
                    {tier.features.map((item) => (
                      <li
                        key={item}
                        className={`flex items-start gap-3 text-body-md ${
                          tier.featured ? "text-on-primary/90" : "text-slate-text"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined mt-0.5 shrink-0 text-[20px] ${
                            tier.featured ? "text-tertiary-fixed" : "text-secondary"
                          }`}
                        >
                          check
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-surface px-margin-mobile py-24 md:px-margin-desktop">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[48px] bg-ink p-10 text-center md:p-20">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-secondary/40 via-transparent to-transparent" />
            <h2 className="relative z-10 mb-6 text-headline-lg-mobile font-semibold text-white md:text-headline-lg">
              Ready to transform your outreach?
            </h2>
            <p className="relative z-10 mx-auto mb-10 max-w-2xl text-body-lg text-white/75">
              Join high-growth teams using Voice Reach CRM to scale sales conversations
              with compliance built in from day one.
            </p>
            <div className="relative z-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
              <Link
                href="/sign-up"
                className="w-full rounded-full bg-white px-12 py-5 text-label-md font-bold text-ink shadow-xl transition-all hover:bg-secondary-fixed active:scale-95 sm:w-auto"
              >
                Claim your free trial
              </Link>
              <Link
                href="/sign-in"
                className="flex items-center gap-2 text-label-md font-bold text-white transition-all hover:gap-3"
              >
                Sign in to dashboard
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-outline-variant/30 bg-white py-20">
        <div className="mx-auto max-w-7xl px-margin-mobile md:px-margin-desktop">
          <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-4">
            <div className="md:col-span-1">
              <span className="mb-6 block text-headline-md font-black text-ink">
                Voice Reach
              </span>
              <p className="text-body-md text-slate-text">
                Enterprise-grade communication automation for modern sales teams.
                Precision. Compliance. Growth.
              </p>
            </div>
            <div>
              <h4 className="mb-6 text-label-md font-bold uppercase tracking-widest text-ink">
                Platform
              </h4>
              <ul className="space-y-4 text-body-md text-slate-text">
                <li>
                  <a href="#features" className="transition-colors hover:text-secondary">
                    Ringless Voicemail
                  </a>
                </li>
                <li>
                  <a href="#compliance" className="transition-colors hover:text-secondary">
                    Compliance Engine
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="transition-colors hover:text-secondary">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="/sign-up" className="transition-colors hover:text-secondary">
                    Get Started
                  </a>
                </li>
              </ul>
            </div>
            <div className="">
              <h4 className="mb-6 text-label-md font-bold uppercase tracking-widest text-ink">
                Company
              </h4>
              <ul className="space-y-4 text-body-md text-slate-text">
                <li>
                  <a href="#" className="transition-colors hover:text-secondary">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-secondary">
                    Security
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-secondary">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-secondary">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-6 text-label-md font-bold uppercase tracking-widest text-ink">
                Connect
              </h4>
              <div className="mb-6 flex gap-4">
                <a
                  href="mailto:hello@voicereach.com"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container transition-all hover:bg-secondary hover:text-white"
                  aria-label="Email us"
                >
                  <span className="material-symbols-outlined text-[20px]">alternate_email</span>
                </a>
                <a
                  href="#"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container transition-all hover:bg-secondary hover:text-white"
                  aria-label="Share"
                >
                  <span className="material-symbols-outlined text-[20px]">share</span>
                </a>
              </div>
              <p className="text-caption text-slate-text">
                Subscribe to our automation insights newsletter.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-outline-variant/20 pt-12 md:flex-row">
            <p className="text-caption text-slate-text">
              © {new Date().getFullYear()} Voice Reach CRM. All rights reserved.
            </p>
            <p className="text-caption font-medium uppercase tracking-wider text-slate-text/60">
              TCPA · FCC · DNC ready
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
