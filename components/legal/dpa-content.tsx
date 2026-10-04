import Link from "next/link";
import { LegalBulletList, LegalSection } from "@/components/legal/legal-page-shell";
import { LegalDisclaimer } from "@/components/legal/legal-disclaimer";
import { integrationsLegalBullets } from "@/lib/marketing/site-offer";
import { LEGAL_ENTITY } from "@/lib/legal/company";
import { LEGAL_ROUTES } from "@/lib/legal/links";

export function DpaContent() {
  return (
    <>
      <p className="mt-8 text-[15px] leading-relaxed text-slate-text">
        This Data Processing Agreement (&ldquo;DPA&rdquo;) forms part of the{" "}
        <Link href={LEGAL_ROUTES.terms} className="text-rose-gold-deep underline">
          Terms of Service
        </Link>{" "}
        between {LEGAL_ENTITY} (&ldquo;Processor,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) and the
        Customer (&ldquo;Controller,&rdquo; &ldquo;you&rdquo;) and applies to the extent we process
        personal data on your behalf in connection with the Service. Capitalized terms not defined
        here have the meaning given in the Terms of Service or applicable data protection law (GDPR,
        CCPA/CPRA, or other).
      </p>

      <LegalSection title="1. Roles of the Parties">
        <LegalBulletList
          items={[
            "You (Customer) are the Controller (or “Business” under CCPA) of the personal data contained in your Contacts/leads uploaded to ARI.",
            "We (Company) are the Processor (or “Service Provider” under CCPA), processing that personal data solely on your documented instructions, as set out in the Terms of Service and this DPA.",
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Subject Matter & Duration">
        <p>
          We process personal data on your behalf for the duration of your subscription to the
          Service, for the purpose of providing CRM, campaign automation, calling, and texting
          functionality.
        </p>
      </LegalSection>

      <LegalSection title="3. Nature & Purpose of Processing">
        <p>
          Processing includes: storage, organization, retrieval, transmission, and deletion of
          Contact records (names, phone numbers, emails, addresses, notes, call/message logs) as
          needed to operate the Service features you configure.
        </p>
      </LegalSection>

      <LegalSection title="4. Categories of Data Subjects">
        <p>
          Individuals whose contact information you upload or generate through the Service - typically your leads, clients, prospects, or other business contacts.
        </p>
      </LegalSection>

      <LegalSection title="5. Categories of Personal Data">
        <LegalBulletList
          items={[
            "Contact details (name, phone, email, address)",
            "Communication content and metadata (call recordings, transcripts, SMS content, timestamps)",
            "Engagement data (opens, clicks, replies, campaign status)",
            "Any additional fields you choose to store in custom CRM fields",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Processor Obligations">
        <p>We agree to:</p>
        <LegalBulletList
          items={[
            "Process personal data only on your documented instructions, including with regard to international transfers, unless required otherwise by law",
            "Ensure personnel with access to personal data are bound by confidentiality obligations",
            "Implement appropriate technical and organizational security measures (see Section 9)",
            "Assist you, where reasonably possible, in responding to data subject requests (access, deletion, correction, portability)",
            "Notify you without undue delay after becoming aware of a personal data breach affecting your data",
            "Delete or return all personal data at the end of the subscription, at your choice, except where retention is required by law",
            "Make available information reasonably necessary to demonstrate compliance with this DPA",
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Subprocessors">
        <p>You authorize us to engage subprocessors to provide the Service, including:</p>
        <LegalBulletList items={integrationsLegalBullets()} />
        <p>
          We will maintain a current list of subprocessors available upon request and will notify you
          of material changes, giving you an opportunity to object on reasonable grounds.
        </p>
      </LegalSection>

      <LegalSection title="8. International Data Transfers">
        <p>
          If personal data is transferred outside the country of origin (e.g., from the EEA/UK to the
          United States), we will rely on an appropriate transfer mechanism, such as Standard
          Contractual Clauses (SCCs), to the extent required by applicable law.
        </p>
      </LegalSection>

      <LegalSection title="9. Security Measures">
        <p>We maintain technical and organizational measures appropriate to the risk, including:</p>
        <LegalBulletList
          items={[
            "Encryption of data in transit",
            "Access controls limiting data access to authorized personnel",
            "Authentication requirements for account access",
            "Regular review of security practices",
          ]}
        />
        <p>No system is completely secure, and we cannot guarantee absolute security.</p>
      </LegalSection>

      <LegalSection title="10. Data Breach Notification">
        <p>
          In the event of a personal data breach affecting Customer Data, we will notify you without
          undue delay and provide reasonably available information to help you meet your own
          notification obligations under applicable law.
        </p>
      </LegalSection>

      <LegalSection title="11. Audits">
        <p>
          Upon reasonable request, and no more than once per year (unless required by a regulator or
          following a breach), we will provide information reasonably necessary to demonstrate
          compliance with this DPA, which may include responding to a written audit questionnaire in
          lieu of an on-site audit.
        </p>
      </LegalSection>

      <LegalSection title="12. Deletion / Return of Data">
        <p>
          Upon termination of the Service, we will, at your election, delete or return all personal
          data within a commercially reasonable period, except to the extent retention is required by
          law.
        </p>
      </LegalSection>

      <LegalSection title="13. CCPA/CPRA Terms (if applicable)">
        <p>To the extent California residents&apos; personal information is processed:</p>
        <LegalBulletList
          items={[
            "We will process personal information only for the limited and specified purpose of providing the Service",
            "We will not sell or share personal information, or retain, use, or disclose it outside the direct business relationship with you",
            "We certify that we understand these restrictions and will comply with them",
          ]}
        />
      </LegalSection>

      <LegalSection title="14. Liability">
        <p>
          Liability under this DPA is subject to the limitation of liability provisions in the
          underlying Terms of Service.
        </p>
      </LegalSection>

      <LegalSection title="15. Precedence">
        <p>
          In the event of a conflict between this DPA and the Terms of Service concerning the
          processing of personal data, this DPA controls.
        </p>
      </LegalSection>

      <LegalDisclaimer />
    </>
  );
}
