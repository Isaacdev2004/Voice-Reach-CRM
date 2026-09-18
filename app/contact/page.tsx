import Link from "next/link";
import { AriLogo } from "@/components/brand/ari-logo";
import { FOUNDING_100 } from "@/lib/marketing/founding";

const SUPPORT_EMAIL = "hello@myari.io";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="border-b border-outline-variant/15 bg-ivory px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/">
            <AriLogo height={40} />
          </Link>
          <Link href="/sign-up" className="text-[14px] font-semibold text-rose-gold-deep hover:underline">
            Start Free
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-16 md:px-8">
        <h1 className="font-serif text-[36px] font-semibold text-ink">Contact &amp; support</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-slate-text">
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
            <p className="text-[11px] font-bold uppercase tracking-widest text-taupe">
              Onboarding
            </p>
            <p className="mt-2 text-[15px] text-slate-text">
              After you sign up, we&apos;ll reach out within 24 hours to schedule your 20-minute
              setup call — lead import, first campaign, and pipeline configuration included.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-taupe">
              Brokerage demos
            </p>
            <p className="mt-2 text-[15px] text-slate-text">
              Managing a team? Email us for Team pricing and a live brokerage walkthrough.
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-[14px] text-taupe">
          <Link href="/" className="font-medium text-rose-gold-deep hover:underline">
            ← Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}
