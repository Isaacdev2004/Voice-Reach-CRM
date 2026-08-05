import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SMS Consent & Opt-In | ARI",
  description:
    "How ARI collects prior express consent for SMS appointment reminders and relationship follow-ups. Reply STOP to opt out.",
  robots: { index: true, follow: true },
};

export default function SmsConsentPage() {
  return (
    <main className="min-h-screen bg-cream text-ink">
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-taupe">ARI</p>
        <h1 className="mt-2 font-serif text-[36px] font-semibold leading-tight">
          SMS consent &amp; opt-in
        </h1>
        <p className="mt-3 text-[15px] text-slate-text">
          Last updated: August 5, 2026 · Program operated by Kikzeny Cartagena LLC d/b/a ARI
        </p>

        <section className="mt-8 space-y-4 text-[15px] leading-relaxed text-slate-text">
          <p>
            ARI is a relationship CRM used by real estate professionals. SMS is used only for
            transactional and relationship follow-ups to people who have already given prior
            express consent. We do not buy SMS lists or message people who have not opted in.
          </p>

          <h2 className="pt-2 font-serif text-[22px] font-semibold text-ink">How consent is collected</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Web / CRM form:</strong> contacts check a clearly labeled box such as
              “I agree to receive SMS appointment reminders and follow-ups from this agent.
              Message frequency varies. Message &amp; data rates may apply. Reply STOP to opt out,
              HELP for help.” The form cannot be submitted without that affirmative checkbox.
            </li>
            <li>
              <strong>Verbal consent:</strong> an agent may collect verbal opt-in on a recorded or
              documented call. The agent stores consent date, source (e.g. “verbal — listing
              consult”), and proof reference in ARI before any SMS is sent.
            </li>
            <li>
              <strong>Written / lead-form consent:</strong> inbound leads from websites or partner
              forms that include SMS disclosure are imported only when consent is documented.
            </li>
          </ul>

          <h2 className="pt-2 font-serif text-[22px] font-semibold text-ink">Sample opt-in language</h2>
          <blockquote className="rounded-xl border border-outline-variant/20 bg-ivory px-4 py-3">
            By checking this box, I agree to receive SMS messages from Kikzeny Cartagena LLC /
            ARI and my assigned agent about appointments, listing or home-search updates, and
            relationship follow-ups. Message frequency varies. Message and data rates may apply.
            Reply STOP to unsubscribe. Reply HELP for help.
          </blockquote>

          <h2 className="pt-2 font-serif text-[22px] font-semibold text-ink">Sample outbound message</h2>
          <blockquote className="rounded-xl border border-outline-variant/20 bg-ivory px-4 py-3">
            Hi FirstName, this is AgentName with a quick update on your home search. Reply STOP
            to opt out. Reply HELP for help.
          </blockquote>

          <h2 className="pt-2 font-serif text-[22px] font-semibold text-ink">Opt-out &amp; help</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Reply <strong>STOP</strong> to cancel. We honor opt-outs immediately and do not
              message that number again unless the person re-opts in.
            </li>
            <li>
              Reply <strong>HELP</strong> for support, or email{" "}
              <a className="text-rose-gold-deep underline" href="mailto:kikzenyc@gmail.com">
                kikzenyc@gmail.com
              </a>
              .
            </li>
          </ul>

          <h2 className="pt-2 font-serif text-[22px] font-semibold text-ink">Message types &amp; frequency</h2>
          <p>
            Typical messages: appointment reminders, follow-up check-ins, listing or showing
            updates, and other service messages related to an existing real estate relationship.
            Frequency varies based on the campaign and the contact’s activity (generally a few
            messages per campaign sequence, not daily marketing blasts).
          </p>

          <h2 className="pt-2 font-serif text-[22px] font-semibold text-ink">Record keeping</h2>
          <p>
            ARI stores consent status, consent date, consent source, and proof reference on the
            contact record. Campaigns will not enroll a contact for SMS unless consent is
            documented as Yes with those fields completed.
          </p>

          <p className="pt-4 text-[13px] text-taupe">
            Related:{" "}
            <Link href="/privacy" className="text-rose-gold-deep underline">
              Privacy policy
            </Link>
            {" · "}
            <Link href="/" className="text-rose-gold-deep underline">
              Home
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
