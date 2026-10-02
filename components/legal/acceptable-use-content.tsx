import Link from "next/link";
import { LegalBulletList, LegalSection } from "@/components/legal/legal-page-shell";
import { LegalDisclaimer } from "@/components/legal/legal-disclaimer";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal/company";
import { LEGAL_ROUTES } from "@/lib/legal/links";

export function AcceptableUseContent() {
  return (
    <>
      <p className="mt-8 text-[15px] leading-relaxed text-slate-text">
        This Acceptable Use Policy (&ldquo;AUP&rdquo;) supplements the{" "}
        <Link href={LEGAL_ROUTES.terms} className="text-rose-gold-deep underline">
          ARI Terms of Service
        </Link>{" "}
        and sets out rules for acceptable use of the Service. Violation of this AUP may result in
        suspension or termination of your account. This AUP may be updated from time to time;
        material changes will be communicated via email or in-app notice.
      </p>

      <LegalSection title="1. Prohibited Uses">
        <p>You may not use ARI to:</p>
        <LegalBulletList
          items={[
            "Send unsolicited communications (calls, texts, or emails) to any individual who has not provided valid consent to be contacted, or in violation of the TCPA, CAN-SPAM, CASL, or applicable state telemarketing laws",
            "Contact individuals on the National Do-Not-Call Registry or a Customer-maintained internal Do-Not-Call list, outside applicable exemptions",
            "Upload contact lists obtained through scraping, purchase from unverified list brokers, or other means that do not establish a lawful basis for contact",
            "Send messages containing false, misleading, or deceptive content",
            "Impersonate any person or entity, or misrepresent your affiliation with a person or entity",
            "Harass, threaten, defraud, or abuse any individual",
            "Transmit malware, viruses, or any code intended to disrupt or damage systems",
            "Attempt to gain unauthorized access to the Service, other accounts, or connected systems",
            "Use the Service to violate any applicable local, state, federal, or international law",
            "Circumvent usage limits, rate limits, or carrier compliance requirements associated with your subscription tier",
            "Resell, sublicense, or provide access to the Service to third parties without our written consent",
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Messaging & Calling Requirements">
        <p>Because ARI includes outbound calling and texting automation, you specifically agree to:</p>
        <LegalBulletList
          items={[
            "Capture and retain documented consent before enrolling any Contact in an automated call or text sequence",
            <>
              Include clear opt-out instructions in messaging campaigns and honor opt-out requests
              within the timeframe required by law (see our{" "}
              <Link href={LEGAL_ROUTES.tcpaConsent} className="text-rose-gold-deep underline">
                TCPA &amp; Do-Not-Call Policy
              </Link>
              )
            </>,
            "Comply with carrier and industry registration requirements for your messaging volume (e.g., A2P 10DLC registration where applicable)",
            "Not use ARI for high-risk or prohibited content categories under carrier guidelines (e.g., debt collection scripts that violate FDCPA, deceptive financial offers)",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Content Standards">
        <p>Content you send or store through ARI must not:</p>
        <LegalBulletList
          items={[
            "Contain hate speech, discriminatory content, or content promoting violence",
            "Infringe on any third party's intellectual property rights",
            "Contain sexually explicit material involving minors, or any other illegal content",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. System Abuse">
        <p>You may not:</p>
        <LegalBulletList
          items={[
            "Exceed reasonable use thresholds in a manner that degrades Service performance for other Customers",
            "Attempt to reverse-engineer, scrape, or extract the Service's underlying code or data structures",
            "Use automated means to create multiple accounts to evade suspension or billing",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Enforcement">
        <p>We reserve the right to:</p>
        <LegalBulletList
          items={[
            "Investigate suspected violations of this AUP",
            "Suspend or terminate accounts found in violation, with or without notice depending on severity",
            "Remove or disable access to specific content or campaigns that violate this AUP",
            "Report unlawful activity to relevant authorities where required",
          ]}
        />
        <p>
          Suspected TCPA violations or carrier compliance violations may result in immediate
          suspension of messaging/calling features, given the shared risk to carrier relationships
          and other Customers on the platform.
        </p>
      </LegalSection>

      <LegalSection title="6. Reporting Violations">
        <p>
          If you become aware of a violation of this AUP by another user, please contact us at{" "}
          <a className="text-rose-gold-deep underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="7. Relationship to Terms of Service">
        <p>
          This AUP is incorporated into and forms part of the ARI Terms of Service. In the event of
          a conflict, the more specific provision controls for the relevant subject matter.
        </p>
      </LegalSection>

      <LegalDisclaimer />
    </>
  );
}
