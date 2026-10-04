import Link from "next/link";
import { LegalBulletList, LegalSection } from "@/components/legal/legal-page-shell";
import { LegalContactBlock } from "@/components/legal/legal-contact";
import { LegalDisclaimer } from "@/components/legal/legal-disclaimer";
import { integrationsLegalBullets, SITE_OFFER } from "@/lib/marketing/site-offer";
import { LEGAL_ENTITY, LEGAL_HOSTING } from "@/lib/legal/company";
import { LEGAL_ROUTES } from "@/lib/legal/links";

export function PrivacyPolicyContent() {
  return (
    <>
      <p className="mt-8 text-[15px] leading-relaxed text-slate-text">
        This Privacy Policy explains how {LEGAL_ENTITY} (&ldquo;Company,&rdquo; &ldquo;we,&rdquo;
        &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, stores, and shares information in
        connection with ARI, our customer relationship management platform (the &ldquo;Service&rdquo;).
        It applies to our subscribers (&ldquo;Customers,&rdquo; &ldquo;you&rdquo;) and, where
        relevant, to the individuals whose data Customers upload or process through the Service
        (&ldquo;Contacts&rdquo; or &ldquo;End Users&rdquo;).
      </p>

      <LegalSection title="1. Scope">
        <p>This Policy covers two categories of data:</p>
        <LegalBulletList
          items={[
            <>
              <strong>Account Data</strong> - information about you as a Customer (billing info, login
              credentials, usage data).
            </>,
            <>
              <strong>Customer Data</strong> - the contacts, leads, call logs, message content, and
              related records you upload to or generate through ARI (e.g., names, phone numbers,
              emails, notes, campaign activity).
            </>,
          ]}
        />
        <p>
          You (the Customer) remain the data controller for Customer Data you upload. We act as a data
          processor/service provider with respect to that data, processing it only to provide the
          Service and as you direct.
        </p>
      </LegalSection>

      <LegalSection title="2. Information We Collect">
        <p>
          <strong>From you directly:</strong>
        </p>
        <LegalBulletList
          items={[
            "Account registration details (name, business name, email, phone)",
            "Billing and payment information (processed via our payment processor; we do not store full card numbers)",
            "Support communications",
          ]}
        />
        <p>
          <strong>Automatically, through your use of the Service:</strong>
        </p>
        <LegalBulletList
          items={[
            "Log data (IP address, browser type, device info, timestamps)",
            "Usage data (features used, campaign activity, login frequency)",
            "Cookies and similar tracking technologies (see Section 8)",
          ]}
        />
        <p>
          <strong>Uploaded or generated through use of ARI:</strong>
        </p>
        <LegalBulletList
          items={[
            "Contact/lead records you import or enter (names, phone numbers, emails, addresses, notes)",
            "Call recordings, call metadata, and transcripts (if calling features are used)",
            "SMS/text message content and delivery logs (if messaging features are used)",
            "Campaign automation sequences and engagement data (opens, clicks, replies)",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. How We Use Information">
        <p>
          <strong>We use Account Data to:</strong>
        </p>
        <LegalBulletList
          items={[
            "Provide, maintain, and improve the Service",
            "Process billing and manage your subscription",
            "Communicate with you about your account, updates, or support requests",
            "Monitor for security, fraud, and abuse",
          ]}
        />
        <p>
          <strong>We process Customer Data (contacts, calls, messages) solely to:</strong>
        </p>
        <LegalBulletList
          items={[
            "Operate the features you use (campaign automation, calling, texting, CRM record-keeping)",
            "Enable integrations you connect (see Section 5)",
            "Provide analytics and reporting back to you within the Service",
          ]}
        />
        <p>
          {SITE_OFFER.aiDataUse.noTraining}
        </p>
        <p>{SITE_OFFER.aiDataUse.summary}</p>
      </LegalSection>

      <LegalSection title="4. Legal Basis for Outbound Calling & Texting">
        <p>ARI includes automation features for outbound calls and text messages. You, as the Customer, are solely responsible for:</p>
        <LegalBulletList
          items={[
            "Obtaining valid consent from each Contact before enrolling them in a calling or texting sequence, consistent with the Telephone Consumer Protection Act (TCPA), CAN-SPAM, and applicable state telemarketing laws",
            "Maintaining records of that consent",
            <>
              Honoring opt-out and Do-Not-Call requests promptly (see our separate{" "}
              <Link href={LEGAL_ROUTES.tcpaConsent} className="text-rose-gold-deep underline">
                TCPA Consent &amp; Do-Not-Call Policy
              </Link>
              )
            </>,
          ]}
        />
        <p>
          We provide tools to help capture and log consent and opt-outs, but we do not verify the
          lawful basis of any specific contact list you upload.
        </p>
      </LegalSection>

      <LegalSection title="5. Third-Party Integrations & Sharing">
        <p>
          ARI integrates with third-party platforms you may choose to connect, including but not
          limited to:
        </p>
        <LegalBulletList items={[...integrationsLegalBullets()]} />
        <p>
          When you connect an integration, Customer Data flows between ARI and that platform
          according to your configuration. Each third-party service has its own privacy practices, and
          we encourage you to review them. We are not responsible for how connected third-party
          platforms handle data once it leaves ARI.
        </p>
        <p>We may also share information with:</p>
        <LegalBulletList
          items={[
            "Service providers who help us operate ARI (hosting, payment processing, customer support tools), under confidentiality obligations",
            "Law enforcement or regulators, if required by law, subpoena, or legal process",
            "A successor entity, in the event of a merger, acquisition, or sale of assets",
          ]}
        />
        <p>We do not sell Account Data or Customer Data to third parties.</p>
      </LegalSection>

      <LegalSection title="6. Data Storage & Security">
        <LegalBulletList
          items={[
            `Data is hosted on ${LEGAL_HOSTING}.`,
            "We use industry-standard safeguards (encryption in transit, access controls, authentication) to protect data, but no system is 100% secure.",
            "Call recordings and message logs, if enabled, are retained according to your account settings and applicable legal requirements.",
            "You are responsible for the security of your own account credentials.",
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Data Retention">
        <LegalBulletList
          items={[
            "Account Data is retained for as long as your subscription is active, plus a reasonable period after cancellation for legal/accounting purposes.",
            "Customer Data is retained per your account settings and deleted or anonymized within a commercially reasonable period after account termination, unless we are required to retain it for legal compliance.",
            "You may request earlier deletion of specific Customer Data by contacting us.",
          ]}
        />
      </LegalSection>

      <LegalSection title="8. Cookies & Tracking">
        <p>
          We use cookies and similar technologies for authentication, session management, and basic
          analytics. You can control cookies through your browser settings, though disabling them may
          affect Service functionality.
        </p>
      </LegalSection>

      <LegalSection title="9. Your Rights (Customers & Contacts)">
        <p>Depending on your location, you (or the Contacts in your account) may have rights to:</p>
        <LegalBulletList
          items={[
            "Access, correct, or delete personal data",
            "Object to or restrict certain processing",
            "Request a copy of data in a portable format",
            "Withdraw consent for calling/texting (opt-out)",
          ]}
        />
        <p>
          <strong>Customers:</strong> Contact us using the information in Section 13 to exercise
          these rights for your Account Data. <strong>Contacts/End Users:</strong> Requests regarding
          data uploaded by a Customer should generally go to that Customer directly, as they are the
          data controller. We will assist Customers in fulfilling such requests.
        </p>
      </LegalSection>

      <LegalSection title="10. GDPR / CCPA">
        <p>
          If you or your Contacts are located in the EEA/UK or California, additional rights may
          apply. See our separate{" "}
          <Link href={LEGAL_ROUTES.dpa} className="text-rose-gold-deep underline">
            Data Processing Agreement (DPA)
          </Link>{" "}
          for GDPR-specific terms, and contact us to request our CCPA disclosures if applicable.
        </p>
      </LegalSection>

      <LegalSection title="11. Children's Privacy">
        <p>
          The Service is not directed to individuals under 18, and we do not knowingly collect data
          from children.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be communicated
          via email or in-app notice. Continued use of the Service after changes take effect
          constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact Us">
        <p>Questions or requests regarding this Privacy Policy:</p>
        <LegalContactBlock />
      </LegalSection>

      <LegalDisclaimer />
    </>
  );
}
