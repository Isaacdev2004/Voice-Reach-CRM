import type { Metadata } from "next";
import Link from "next/link";
import { StartFreeButton } from "@/components/landing/start-free-button";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { BRAND_NAME } from "@/lib/brand";
import { FOUNDING_100 } from "@/lib/marketing/founding";
import { pageMetadata } from "@/lib/seo/metadata";
import { PRODUCT_NAV_LINKS } from "@/lib/seo/marketing-nav";

export const metadata: Metadata = pageMetadata({
  title: "About ARI CRM — Lead Follow-Up for Real Estate Agents",
  description:
    "ARI CRM helps real estate agents capture, organize, and automatically follow up with leads. Learn why we built a CRM focused on follow-up — not just contact storage.",
  path: "/about",
});

const SUPPORT_EMAIL = "hello@myari.io";

export default function AboutPage() {
  return (
    <MarketingShell>
      <section className="hero-gradient py-12 md:py-16 lg:py-20">
        <div className="landing-shell mx-auto max-w-[44rem]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-gold-deep md:text-[12px]">
            About {BRAND_NAME}
          </p>
          <h1 className="mt-3 font-serif text-[2.25rem] font-semibold leading-tight text-ink md:text-[2.75rem] lg:text-[3rem]">
            The CRM that actually follows up
          </h1>
          <p className="mt-5 text-[16px] leading-relaxed text-ink/80 md:text-[17px] lg:text-[18px]">
            {BRAND_NAME} exists because real estate agents lose deals they already paid for — not
            from lack of leads, but from inconsistent follow-up. We built a CRM that organizes your
            pipeline and automates outreach so no opportunity falls through the cracks.
          </p>
        </div>
      </section>

      <section className="bg-cream py-12 md:py-16">
        <div className="landing-shell mx-auto max-w-[44rem] space-y-10">
          <div>
            <h2 className="font-serif text-[26px] font-semibold text-ink md:text-[32px]">
              Why we built {BRAND_NAME}
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-slate-text md:text-[17px]">
              Most CRMs are databases with a login screen. Agents still copy-paste texts, forget to
              call back, and watch Zillow leads go cold. {BRAND_NAME} connects contact management to
              automated SMS, email, and ringless voicemail — so follow-up happens whether you're in
              a showing, at closing, or off the clock.
            </p>
            <p className="mt-4 text-[16px] leading-relaxed text-slate-text md:text-[17px]">
              We're launching with the {FOUNDING_100.name} — the first {FOUNDING_100.seatsTotal}{" "}
              agents get white-glove onboarding, founding-member pricing, and a direct line to the
              team while we build alongside working Realtors.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-[26px] font-semibold text-ink md:text-[32px]">
              Who {BRAND_NAME} is for
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-slate-text md:text-[17px]">
              Solo agents and small teams who buy leads, farm neighborhoods, and nurture spheres —
              and need a system that keeps every contact moving toward a conversation. If you've ever
              lost a deal because you forgot to follow up, {BRAND_NAME} is built for you.
            </p>
          </div>

          <div>
            <h2 className="font-serif text-[26px] font-semibold text-ink md:text-[32px]">
              What we believe
            </h2>
            <ul className="mt-4 space-y-3 text-[16px] leading-relaxed text-slate-text md:text-[17px]">
              <li>Follow-up is the highest-leverage activity in real estate sales.</li>
              <li>Automation should feel personal — you control the message, we handle the timing.</li>
              <li>Compliance and consent aren't optional; they're built into every campaign.</li>
              <li>Agents shouldn't need a tech team to get value from their CRM.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-ivory py-10 md:py-12">
        <div className="landing-shell">
          <h2 className="font-serif text-[22px] font-semibold text-ink md:text-[26px]">
            Explore the platform
          </h2>
          <nav className="mt-4 flex flex-wrap gap-3">
            {PRODUCT_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-outline-variant/20 bg-cream px-4 py-2 text-[14px] font-medium text-ink/80 hover:border-rose-gold/40 hover:text-rose-gold-deep"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/realtor-lead-follow-up"
              className="rounded-full border border-outline-variant/20 bg-cream px-4 py-2 text-[14px] font-medium text-ink/80 hover:border-rose-gold/40 hover:text-rose-gold-deep"
            >
              Realtor follow-up
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-outline-variant/20 bg-cream px-4 py-2 text-[14px] font-medium text-ink/80 hover:border-rose-gold/40 hover:text-rose-gold-deep"
            >
              Pricing
            </Link>
          </nav>
        </div>
      </section>

      <section className="hero-gradient py-12 md:py-16">
        <div className="landing-shell mx-auto max-w-[44rem] text-center">
          <h2 className="font-serif text-[26px] font-semibold text-ink md:text-[32px]">
            Get in touch
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-slate-text">
            Questions about onboarding, brokerage demos, or billing? Email us at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-rose-gold-deep hover:underline">
              {SUPPORT_EMAIL}
            </a>{" "}
            or visit our{" "}
            <Link href="/contact" className="font-semibold text-rose-gold-deep hover:underline">
              contact page
            </Link>
            .
          </p>
          <div className="mt-8">
            <StartFreeButton
              location="about-cta"
              label="Start Your 14-Day Free Trial"
              showArrow
              className="!px-10 !py-4 !text-[15px]"
            />
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
