import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | ARI",
  description: "Privacy practices for ARI, operated by Kikzeny Cartagena LLC.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-cream text-ink">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-taupe">ARI</p>
        <h1 className="mt-2 font-serif text-[36px] font-semibold">Privacy policy</h1>
        <p className="mt-3 text-[15px] text-slate-text">
          Last updated: August 5, 2026 · Kikzeny Cartagena LLC
        </p>

        <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-slate-text">
          <p>
            Kikzeny Cartagena LLC (“we”) operates ARI, a relationship CRM. We collect contact
            information (name, phone, email, notes, consent records) that agents enter or that
            contacts provide through forms, so we can manage relationships and send consented
            communications (SMS, email, and voicemail campaigns).
          </p>
          <p>
            We do not sell personal information. We share data with service providers needed to
            operate the product (for example hosting, authentication, SMS, email, and voicemail
            delivery partners) under contractual safeguards.
          </p>
          <p>
            Contacts may opt out of SMS by replying STOP. For privacy questions, email{" "}
            <a className="text-rose-gold-deep underline" href="mailto:kikzenyc@gmail.com">
              kikzenyc@gmail.com
            </a>
            .
          </p>
          <p>
            SMS consent details:{" "}
            <Link href="/sms-consent" className="text-rose-gold-deep underline">
              SMS consent &amp; opt-in
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
