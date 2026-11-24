import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { SmsOptInForm } from "@/components/legal/sms-opt-in-form";
import { LEGAL_RELATED } from "@/lib/legal/links";
import {
  getSubscriberBrand,
  SUBSCRIBER_BRAND_SLUGS,
  subscriberBrandPath,
} from "@/lib/messaging/subscriber-brands";
import { absoluteUrl } from "@/lib/seo/site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return SUBSCRIBER_BRAND_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = getSubscriberBrand(slug);
  if (!brand) return { title: "Business profile" };

  const path = subscriberBrandPath(brand.slug);
  return {
    title: `${brand.displayName} · Business & SMS consent | MyARI`,
    description: `${brand.legalName} — ${brand.summary}`,
    alternates: { canonical: path },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${brand.displayName} · Business & SMS consent`,
      description: brand.summary,
      url: absoluteUrl(path),
    },
  };
}

export default async function SubscriberBrandPage({ params }: PageProps) {
  const { slug } = await params;
  const brand = getSubscriberBrand(slug);
  if (!brand) notFound();

  return (
    <LegalPageShell
      title={brand.displayName}
      lastUpdated={brand.lastUpdated}
      subtitle={`${brand.legalName} · ${brand.cityState}`}
      related={[...LEGAL_RELATED.smsConsent]}
    >
      <section className="mt-8 space-y-4 text-[15px] leading-relaxed text-slate-text">
        <p>{brand.summary}</p>
        <p>
          Messaging for this program is sent on behalf of <strong>{brand.legalName}</strong>,
          operated with MyARI CRM tools. This page is the public business profile and SMS consent
          disclosure for carrier registration.
        </p>

        <h2 className="pt-2 font-serif text-[22px] font-semibold text-ink">Contact</h2>
        <ul className="list-none space-y-1 pl-0">
          <li>
            <strong>Agent:</strong> {brand.agentName}
          </li>
          <li>
            <strong>Phone:</strong>{" "}
            <a className="text-rose-gold-deep underline" href={`tel:${brand.phoneTel}`}>
              {brand.phoneDisplay}
            </a>
          </li>
          <li>
            <strong>Email:</strong>{" "}
            <a className="text-rose-gold-deep underline" href={`mailto:${brand.email}`}>
              {brand.email}
            </a>
          </li>
          <li>
            <strong>Location:</strong> {brand.cityState}
          </li>
        </ul>

        <SmsOptInForm programName={brand.legalName} />

        <h2 className="pt-2 font-serif text-[22px] font-semibold text-ink">How consent is collected</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Web form on this page:</strong> the SMS opt-in above is unchecked until the
            person checks it. The disclosure names {brand.legalName}, states that message
            frequency varies, and includes STOP, HELP, the privacy policy, and the terms of
            service. The form cannot be saved without that checkbox.
          </li>
          <li>
            <strong>Verbal consent:</strong> an agent may collect verbal opt-in on a recorded or
            documented call. Consent date, source, and proof reference are stored in ARI before
            any SMS is sent.
          </li>
          <li>
            <strong>Written / lead-form consent:</strong> inbound leads from websites or partner
            forms that include SMS disclosure are imported only when consent is documented.
          </li>
        </ul>

        <h2 className="pt-2 font-serif text-[22px] font-semibold text-ink">Sample opt-in language</h2>
        <blockquote className="rounded-xl border border-outline-variant/20 bg-ivory px-4 py-3">
          By checking this box, I agree to receive SMS messages from {brand.legalName} about
          appointments, listing or home-search updates, and relationship follow-ups. Message
          frequency varies. Message and data rates may apply. Reply STOP to unsubscribe. Reply
          HELP for help.
        </blockquote>

        <h2 className="pt-2 font-serif text-[22px] font-semibold text-ink">
          Sample outbound messages
        </h2>
        <ul className="space-y-3">
          {brand.sampleMessages.map((message) => (
            <li key={message}>
              <blockquote className="rounded-xl border border-outline-variant/20 bg-ivory px-4 py-3">
                {message}
              </blockquote>
            </li>
          ))}
        </ul>

        <h2 className="pt-2 font-serif text-[22px] font-semibold text-ink">Opt-out &amp; help</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Reply <strong>STOP</strong> to cancel. Opt-outs are honored immediately; that number
            is not messaged again unless the person re-opts in.
          </li>
          <li>
            Reply <strong>HELP</strong> for support, or email{" "}
            <a className="text-rose-gold-deep underline" href={`mailto:${brand.email}`}>
              {brand.email}
            </a>
            .
          </li>
        </ul>

        <h2 className="pt-2 font-serif text-[22px] font-semibold text-ink">Message types &amp; frequency</h2>
        <p>
          Typical messages: appointment reminders, follow-up check-ins, listing or showing updates,
          and other service messages related to an existing real estate relationship. Frequency
          varies based on the campaign and the contact&apos;s activity (generally a few messages
          per campaign sequence, not daily marketing blasts).
        </p>

        <h2 className="pt-2 font-serif text-[22px] font-semibold text-ink">Record keeping</h2>
        <p>
          ARI stores consent status, consent date, consent source, and proof reference on the
          contact record. Campaigns will not enroll a contact for SMS unless consent is documented
          as Yes with those fields completed. Platform privacy terms:{" "}
          <Link href="/privacy" className="text-rose-gold-deep underline">
            Privacy policy
          </Link>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
