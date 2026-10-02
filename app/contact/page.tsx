import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact/contact-form";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { SITE_OFFER } from "@/lib/marketing/site-offer";
import { pageMetadata } from "@/lib/seo/metadata";
import { PRODUCT_NAV_LINKS } from "@/lib/seo/marketing-nav";

export const metadata: Metadata = pageMetadata({
  title: "Contact & Support",
  description:
    "Contact ARI CRM for onboarding help, billing questions, or brokerage walkthroughs. Email hello@myari.io or send a message — white-glove setup included on every plan.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <MarketingShell>
      <div className="landing-shell mx-auto max-w-3xl px-4 py-12 md:px-0 md:py-16">
        <h1 className="font-serif text-[36px] font-semibold text-ink md:text-[40px]">
          Contact &amp; support
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-slate-text md:text-[17px]">
          {SITE_OFFER.whiteGlove.shortLine}. {SITE_OFFER.whiteGlove.contactWindow} Reach us for setup
          help, billing questions, or a live brokerage walkthrough.
        </p>

        <ContactForm />

        <div className="mt-10 space-y-6 rounded-2xl border border-outline-variant/15 bg-ivory p-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-taupe">Email directly</p>
            <a
              href={`mailto:${SITE_OFFER.supportEmail}`}
              className="mt-2 block text-[18px] font-semibold text-rose-gold-deep hover:underline"
            >
              {SITE_OFFER.supportEmail}
            </a>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-taupe">Onboarding</p>
            <p className="mt-2 text-[15px] text-slate-text md:text-[16px]">
              After you sign up, we schedule a setup call — lead import, first campaign, and pipeline
              configuration included.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-taupe">
              Brokerage demos
            </p>
            <p className="mt-2 text-[15px] text-slate-text md:text-[16px]">
              Managing a team? Use the form above or email us for Team pricing and a live brokerage
              walkthrough.
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
