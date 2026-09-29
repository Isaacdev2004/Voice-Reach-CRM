import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { RefundPolicyContent } from "@/components/legal/refund-policy-content";
import { LEGAL_EFFECTIVE_DATE, LEGAL_ENTITY_DBA } from "@/lib/legal/company";
import { LEGAL_RELATED } from "@/lib/legal/links";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy | ARI",
  description: `Billing cancellations and refund policy for ARI, operated by ${LEGAL_ENTITY_DBA}.`,
  robots: { index: true, follow: true },
};

export default function RefundsPage() {
  return (
    <LegalPageShell
      title="Refund & Cancellation Policy"
      lastUpdated={LEGAL_EFFECTIVE_DATE}
      subtitle={`Effective ${LEGAL_EFFECTIVE_DATE} · ${LEGAL_ENTITY_DBA}`}
      related={[...LEGAL_RELATED.refunds]}
    >
      <RefundPolicyContent />
    </LegalPageShell>
  );
}
