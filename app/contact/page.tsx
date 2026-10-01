import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { FOUNDING_100 } from "@/lib/marketing/founding";
import { pageMetadata } from "@/lib/seo/metadata";
import { PRODUCT_NAV_LINKS } from "@/lib/seo/marketing-nav";

export const metadata: Metadata = pageMetadata({
  title: "Contact & Support",
  description:
    "Contact ARI CRM for onboarding help, billing questions, or brokerage demos. Email hello@myari.io — white-glove setup for Founding 100 members.",
  path: "/contact",
});

const SUPPORT_EMAIL = "hello@myari.io";

export default function ContactPage() {
  return (
    <MarketingShell>
      <div className="landing-shell mx-auto max-w-3xl px-4 py-12 md:px-0 md:py-16">
        <h1 className="font-serif text-[36px] font-semibold text-ink md:text-[40px]">
          Contact &amp; support
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-slate-text md:text-[17px]">
          {FOUNDING_100.name} members get white-glove onboarding and direct founder support during
          launch. Reach us for setup help, billing questions, or brokerage demos.
        </p>

        <div className="mt-10 space-y-6 rounded-2xl border border-outline-variant/15 bg-ivory p-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-taupe">Email</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-2 block text-[18px] font-semibold text-rose-gold-deep hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-taupe">Onboarding</p>
            <p className="mt-2 text-[15px] text-slate-text md:text-[16px]">
              After you sign up, we&apos;ll reach out within 24 hours to schedule your 20-minute
              setup call — lead import, first campaign, and pipeline configuration included.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-taupe">
              Brokerage demos
            </p>
            <p className="mt-2 text-[15px] text-slate-text md:text-[16px]">
              Managing a team? Email us for Team pricing and a live brokerage walkthrough.
            </p>
          </div>
        </div>

        <div className="mt-10">
          <p className="text-[11px] font-bold uppercase tracking-widest text-taupe">Product</p>
          <nav className="mt-3 flex flex-wrap gap-3">
            {PRODUCT_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[14px] font-medium text-rose-gold-deep hover:underline"
              >
                {link.label}
              </Link>
            ))}
            <Link href="/pricing" className="text-[14px] font-medium text-rose-gold-deep hover:underline">
              Pricing
            </Link>
            <Link href="/about" className="text-[14px] font-medium text-rose-gold-deep hover:underline">
              About
            </Link>
          </nav>
        </div>

        <p className="mt-8 text-center text-[14px] text-taupe">
          <Link href="/" className="font-medium text-rose-gold-deep hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </MarketingShell>
  );
}
