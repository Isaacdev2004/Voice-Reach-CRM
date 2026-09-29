import Link from "next/link";
import { LegalBulletList, LegalSection } from "@/components/legal/legal-page-shell";
import { LegalContactBlock } from "@/components/legal/legal-contact";
import { LegalDisclaimer } from "@/components/legal/legal-disclaimer";
import { LEGAL_CONTACT_EMAIL, NON_PAYMENT_GRACE_DAYS } from "@/lib/legal/company";
import { LEGAL_ROUTES } from "@/lib/legal/links";

export function RefundPolicyContent() {
  return (
    <>
      <p className="mt-8 text-[15px] leading-relaxed text-slate-text">
        This Policy supplements the{" "}
        <Link href={LEGAL_ROUTES.terms} className="text-rose-gold-deep underline">
          ARI Terms of Service
        </Link>{" "}
        and describes how billing cancellations and refunds work.
      </p>

      <LegalSection title="1. Cancellation">
        <LegalBulletList
          items={[
            <>
              You may cancel your subscription at any time from your account settings or by emailing{" "}
              <a className="text-rose-gold-deep underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
                {LEGAL_CONTACT_EMAIL}
              </a>
              .
            </>,
            "Cancellation takes effect at the end of your current billing period. You retain access to the Service until that date.",
            "We do not prorate or refund the unused portion of a billing period when you cancel mid-cycle.",
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Automatic Renewal">
        <p>
          Subscriptions renew automatically at the end of each billing cycle (monthly or annual,
          depending on your plan) unless canceled before the renewal date. You will be billed using
          the payment method on file.
        </p>
      </LegalSection>

      <LegalSection title="3. Refunds">
        <LegalBulletList
          items={[
            <>
              <strong>General policy:</strong> Fees paid are non-refundable, including partial
              months, downgrade differences, or unused features.
            </>,
            <>
              <strong>Billing errors:</strong> If you believe you were charged in error (e.g.,
              duplicate charge, charged after cancellation), contact us within 30 days and we will
              investigate and issue a corrective refund if warranted.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Free Trials">
        <p>
          If you are on a free trial, canceling before the trial ends prevents any charge. If you do
          not cancel, your card will be charged for the plan you selected once the trial ends, per
          Section 2 above.
        </p>
      </LegalSection>

      <LegalSection title="5. Downgrades & Upgrades">
        <LegalBulletList
          items={[
            "Upgrades take effect immediately; you will be charged a prorated amount for the remainder of the current billing cycle.",
            "Downgrades take effect at the start of the next billing cycle; no refund is issued for the difference in the current cycle.",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Non-Payment & Suspension">
        <p>
          If a payment fails, we will attempt to charge the payment method on file. If payment is
          not resolved within {NON_PAYMENT_GRACE_DAYS} days, your account may be suspended, and
          Customer Data may become inaccessible until payment is resolved or the account is
          terminated per the Terms of Service.
        </p>
      </LegalSection>

      <LegalSection title="7. Data After Cancellation">
        <p>
          Upon cancellation or termination, your access to Customer Data through ARI ends per the
          terms in our{" "}
          <Link href={LEGAL_ROUTES.privacy} className="text-rose-gold-deep underline">
            Privacy Policy
          </Link>
          . We recommend exporting your contact and campaign data before canceling.
        </p>
      </LegalSection>

      <LegalSection title="8. Contact">
        <p>Questions about billing, cancellations, or refunds:</p>
        <LegalContactBlock />
      </LegalSection>

      <LegalDisclaimer>
        This document is a template and does not constitute legal advice. Review billing terms with a
        licensed attorney before publishing.
      </LegalDisclaimer>
    </>
  );
}
