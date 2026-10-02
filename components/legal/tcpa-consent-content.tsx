import Link from "next/link";
import { LegalBulletList, LegalSection } from "@/components/legal/legal-page-shell";
import { LegalContactBlock } from "@/components/legal/legal-contact";
import { LegalDisclaimer } from "@/components/legal/legal-disclaimer";
import { LEGAL_ROUTES } from "@/lib/legal/links";

export function TcpaConsentContent() {
  return (
    <>
      <p className="mt-8 text-[15px] leading-relaxed text-slate-text">
        This Policy explains the consent, documentation, and opt-out requirements that apply to any
        Customer using ARI&apos;s outbound calling and texting automation features. It supplements
        the{" "}
        <Link href={LEGAL_ROUTES.terms} className="text-rose-gold-deep underline">
          ARI Terms of Service
        </Link>{" "}
        and{" "}
        <Link href={LEGAL_ROUTES.acceptableUse} className="text-rose-gold-deep underline">
          Acceptable Use Policy
        </Link>
        . This Policy places compliance obligations directly on the Customer — ARI provides tools to
        help you comply, but we do not verify the lawful basis of any contact list you upload, and
        you are responsible for your own compliance with the Telephone Consumer Protection Act
        (TCPA), state telemarketing laws, and carrier requirements.
      </p>

      <LegalSection title="1. Why This Matters">
        <p>
          The TCPA imposes statutory damages of $500 to $1,500 per violation for unauthorized
          autodialed calls or texts to a wireless number without proper consent. As the party
          sending the message or making the call, you (the Customer) bear direct legal exposure —
          and misuse across the platform can also result in carrier-level penalties or shutdowns
          that affect all ARI customers. This is why compliance is a condition of using ARI&apos;s
          calling/texting features, not just a suggestion.
        </p>
      </LegalSection>

      <LegalSection title="2. Consent Requirements">
        <p>Before enrolling any Contact in an automated call or text sequence through ARI, you must have:</p>
        <LegalBulletList
          items={[
            <>
              <strong>Prior Express Written Consent</strong> for marketing/promotional calls or texts
              using an autodialer or prerecorded voice — meaning the individual agreed in writing
              (which can be electronic, e.g., a checked box or submitted form) to receive such
              communications from you, at the specific number, and understood consent was not a
              condition of purchase.
            </>,
            <>
              <strong>Prior Express Consent</strong> (a lower bar, but still required) for
              informational/transactional messages.
            </>,
            "A clear record of how and when consent was obtained (e.g., website form submission with timestamp, signed listing agreement, verbal consent recorded during a call with disclosure).",
          ]}
        />
        <p>
          Do not upload purchased or scraped contact lists into ARI&apos;s calling/texting features
          unless you can document a valid consent basis for each contact. This is one of the most
          common sources of TCPA liability.
        </p>
      </LegalSection>

      <LegalSection title="3. Required Disclosures at Point of Consent">
        <p>Your consent collection method (web form, sign-up sheet, etc.) should disclose:</p>
        <LegalBulletList
          items={[
            "That the individual is agreeing to receive automated calls/texts",
            "The identity of the business sending them",
            "That message/data rates may apply (for texts)",
            "That consent is not a condition of any purchase",
            "How to opt out",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Do-Not-Call (DNC) Compliance">
        <LegalBulletList
          items={[
            "You must not contact numbers on the National Do-Not-Call Registry for marketing purposes unless an exemption applies (e.g., existing business relationship, prior express written consent).",
            "You must maintain and honor your own internal Do-Not-Call list for anyone who has asked not to be contacted, regardless of registry status.",
            "ARI provides opt-out and suppression list tools — you are responsible for using them and keeping suppression lists current across all your campaigns.",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Opt-Out Handling">
        <LegalBulletList
          items={[
            "Every text campaign must include a clear opt-out mechanism (e.g., “Reply STOP to opt out”).",
            "Opt-out requests must be honored within 10 business days (sooner is best practice — ARI processes STOP replies automatically where supported).",
            "For calls, honor verbal opt-out or “do not call” requests immediately and add the number to your suppression list.",
            "Re-contacting an opted-out number, even in a different campaign, is a violation.",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Time-of-Day Restrictions">
        <p>
          Absent different state law limits, do not call or text residential/wireless numbers before
          8:00 AM or after 9:00 PM in the Contact&apos;s local time zone.
        </p>
      </LegalSection>

      <LegalSection title="7. State Law Variations">
        <p>
          Several states (e.g., Florida, where you are based, plus states like California,
          Washington, Oklahoma) impose additional telemarketing restrictions beyond the federal TCPA,
          including registration requirements, stricter consent rules, or private rights of action.
          If you or your Customers contact individuals across multiple states, confirm compliance
          with each applicable state&apos;s telemarketing law.
        </p>
      </LegalSection>

      <LegalSection title="8. Record-Keeping">
        <p>Maintain records of:</p>
        <LegalBulletList
          items={[
            "Consent documentation for each Contact enrolled in calling/texting",
            "Opt-out requests and the date honored",
            "Suppression list history",
          ]}
        />
        <p>
          Retain these records for at least 4 years, consistent with the TCPA&apos;s statute of
          limitations.
        </p>
      </LegalSection>

      <LegalSection title="9. Carrier Registration (A2P 10DLC)">
        <p>
          If your text messages route through a carrier network (e.g., via Twilio or similar
          infrastructure), your business must complete A2P 10DLC registration before sending anything
          beyond low-volume test traffic. Unregistered senders face message filtering, throttling, or
          outright blocking by carriers. This is a business registration step, separate from ARI
          itself — see our onboarding guide for details on completing it.
        </p>
      </LegalSection>

      <LegalSection title="10. Consequences of Non-Compliance">
        <p>Violations of this Policy may result in:</p>
        <LegalBulletList
          items={[
            "Immediate suspension of your calling/texting features",
            "Account termination per the Terms of Service",
            "You remaining solely liable for any statutory damages, regulatory fines, or legal costs arising from your non-compliant use",
          ]}
        />
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>Questions about this Policy or how to configure consent/opt-out tracking in ARI:</p>
        <LegalContactBlock />
      </LegalSection>

      <LegalDisclaimer />
    </>
  );
}
