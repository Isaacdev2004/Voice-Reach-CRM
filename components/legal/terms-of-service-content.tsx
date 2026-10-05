import { LEGAL_ENTITY, LEGAL_GOVERNING_STATE } from "@/lib/legal/company";
import { LegalBulletList, LegalSection } from "@/components/legal/legal-page-shell";
import { LegalContactBlock } from "@/components/legal/legal-contact";
import { LegalDisclaimer } from "@/components/legal/legal-disclaimer";
import { SITE_OFFER } from "@/lib/marketing/site-offer";

export function TermsOfServiceContent() {
  return (
    <>
      <p className="mt-8 text-[15px] leading-relaxed text-slate-text">
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of ARI, a
        customer relationship management platform (&ldquo;Service&rdquo;), operated by{" "}
        {LEGAL_ENTITY}{" "}
        (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
        &ldquo;our&rdquo;). By creating an account, subscribing to, or otherwise using the
        Service, you (&ldquo;Customer,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) agree to
        be bound by these Terms. If you do not agree, do not use the Service.
      </p>

      <LegalSection title="1. The Service">
        <p>
          ARI provides customer relationship management tools, including but not limited to
          contact and lead management, campaign automation, communication sequencing, and related
          integrations (collectively, the &ldquo;Service&rdquo;). We may add, modify, or
          discontinue features at our discretion, with reasonable notice for material changes.
        </p>
      </LegalSection>

      <LegalSection title="2. Accounts">
        <LegalBulletList
          items={[
            "You must provide accurate, current, and complete information when creating an account.",
            "You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account.",
            "You must notify us promptly of any unauthorized use of your account.",
            "You must be at least 18 years old and have the legal authority to enter into these Terms on behalf of yourself or the business you represent.",
          ]}
        />
      </LegalSection>

      <LegalSection title="3. Subscription Plans & Billing">
        <LegalBulletList
          items={[
            <>
              <strong>Plans.</strong> ARI is offered under tiered subscription plans (currently
              Starter, Growth, and Pro), each with different feature sets and pricing as described
              on our pricing page or order form.
            </>,
            <>
              <strong>Billing Cycle.</strong> Subscriptions are billed in advance on a monthly (or
              annual, if selected) recurring basis, via the payment method on file.
            </>,
            <>
              <strong>Automatic Renewal.</strong> Subscriptions automatically renew at the end of
              each billing cycle unless canceled prior to the renewal date.
            </>,
            <>
              <strong>Price Changes.</strong> We may change subscription pricing with at least 30
              days&apos; notice before the change takes effect on your next billing cycle.
            </>,
            <>
              <strong>Late/Failed Payments.</strong> If payment fails, we may suspend or terminate
              access to the Service until payment is received.
            </>,
            <>
              <strong>Taxes.</strong> Fees are exclusive of applicable taxes, which you are
              responsible for unless we are required by law to collect them.
            </>,
            <>
              <strong>Refunds.</strong> Except as required by law or expressly stated in an order
              form, fees are non-refundable, including for partial billing periods.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Free Trials">
        <p>
          If a free trial is offered, it will convert to a paid subscription automatically at the
          end of the trial period unless canceled before it ends. We may modify or terminate trial
          offers at any time without notice.
        </p>
      </LegalSection>

      <LegalSection title="5. Acceptable Use">
        <p>You agree not to:</p>
        <LegalBulletList
          items={[
            "Use the Service for any unlawful purpose, including sending unsolicited communications (spam) in violation of applicable law (e.g., TCPA, CAN-SPAM, CASL);",
            "Upload or transmit data you do not have the right to use, including contact information obtained without proper consent;",
            "Reverse-engineer, decompile, or attempt to extract the source code of the Service;",
            "Interfere with or disrupt the integrity or performance of the Service;",
            "Use the Service to harass, defraud, or mislead any third party;",
            "Resell or sublicense the Service without our prior written consent.",
          ]}
        />
        <p>
          You are solely responsible for ensuring your use of the Service (including any automated
          messaging, calling, or texting features) complies with applicable telemarketing, data
          privacy, and consumer protection laws.
        </p>
      </LegalSection>

      <LegalSection title="6. Customer Data">
        <LegalBulletList
          items={[
            <>
              <strong>Ownership.</strong> You retain all rights to the data, contacts, and content
              you upload to the Service (&ldquo;Customer Data&rdquo;).
            </>,
            <>
              <strong>License to Us.</strong> You grant us a limited license to host, process, and
              use Customer Data solely to provide and improve the Service.
            </>,
            <>
              <strong>Your Responsibility.</strong> You are responsible for the accuracy, legality,
              and consent basis of any Customer Data you upload, including contact lists used for
              outreach campaigns.
            </>,
            <>
              <strong>Data Deletion.</strong> Upon termination of your account, we will delete or
              anonymize Customer Data within a commercially reasonable period, except as required
              for legal, backup, or compliance purposes.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Third-Party Integrations">
        <p>
          The Service may integrate with third-party platforms you connect (currently{" "}
          {SITE_OFFER.integrations.connected.map((i) => i.label).join(" and ")}, plus messaging
          providers such as {SITE_OFFER.integrations.messaging.join(", ")}). We are not responsible
          for the availability, performance, or data practices of third-party services, and your use
          of such integrations is subject to their own terms.
        </p>
      </LegalSection>

      <LegalSection title="8. Intellectual Property">
        <p>
          The Service, including its software, design, trademarks, and content (excluding Customer
          Data), is owned by the Company and protected by intellectual property laws. These Terms
          do not grant you any rights to our intellectual property except the limited right to use
          the Service as permitted herein.
        </p>
      </LegalSection>

      <LegalSection title="9. Confidentiality">
        <p>
          Each party agrees to protect the other&apos;s confidential information disclosed in
          connection with the Service and not to use it except as necessary to perform obligations
          under these Terms.
        </p>
      </LegalSection>

      <LegalSection title="10. Disclaimers">
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
          WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT
          WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
        </p>
      </LegalSection>

      <LegalSection title="11. Limitation of Liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL THE COMPANY BE LIABLE FOR ANY
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS,
          REVENUE, DATA, OR BUSINESS OPPORTUNITY, ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL
          AGGREGATE LIABILITY FOR ANY CLAIM ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE
          SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
        </p>
      </LegalSection>

      <LegalSection title="12. Indemnification">
        <p>
          You agree to indemnify and hold harmless the Company, its officers, employees, and agents
          from any claims, damages, liabilities, and expenses (including reasonable attorneys&apos;
          fees) arising from your use of the Service, your violation of these Terms, or your
          violation of any law or third-party right, including consent or privacy laws related to
          Customer Data.
        </p>
      </LegalSection>

      <LegalSection title="13. Term & Termination">
        <LegalBulletList
          items={[
            "These Terms remain in effect while you use the Service.",
            "Either party may terminate for convenience by canceling the subscription, effective at the end of the current billing period.",
            "We may suspend or terminate your access immediately for material breach of these Terms, including non-payment or unlawful use.",
            "Sections that by their nature should survive termination (e.g., Payment obligations accrued, Intellectual Property, Disclaimers, Limitation of Liability, Indemnification) will survive.",
          ]}
        />
      </LegalSection>

      <LegalSection title="14. Modifications to These Terms">
        <p>
          We may update these Terms from time to time. We will provide notice of material changes
          (e.g., via email or in-app notice). Continued use of the Service after changes take
          effect constitutes acceptance of the revised Terms.
        </p>
      </LegalSection>

      <LegalSection title="15. Governing Law & Dispute Resolution">
        <p>
          These Terms are governed by the laws of the State of {LEGAL_GOVERNING_STATE}, without
          regard to conflict-of-law principles. Any disputes arising under these Terms shall be
          resolved in the state or federal courts located in {LEGAL_GOVERNING_STATE}, and both
          parties consent to jurisdiction there.
        </p>
      </LegalSection>

      <LegalSection title="16. Miscellaneous">
        <LegalBulletList
          items={[
            <>
              <strong>Entire Agreement.</strong> These Terms, together with any order form or
              Privacy Policy, constitute the entire agreement between you and the Company regarding
              the Service.
            </>,
            <>
              <strong>Severability.</strong> If any provision is found unenforceable, the remaining
              provisions remain in full effect.
            </>,
            <>
              <strong>No Waiver.</strong> Failure to enforce any provision is not a waiver of that
              provision.
            </>,
            <>
              <strong>Assignment.</strong> You may not assign these Terms without our prior written
              consent; we may assign these Terms in connection with a merger, acquisition, or sale
              of assets.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="17. Contact">
        <p>Questions about these Terms should be directed to:</p>
        <LegalContactBlock />
      </LegalSection>

      <LegalDisclaimer />
    </>
  );
}
