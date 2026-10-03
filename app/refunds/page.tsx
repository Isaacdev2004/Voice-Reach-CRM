import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { RefundPolicyContent } from "@/components/legal/refund-policy-content";
import { LEGAL_ENTITY_DBA } from "@/lib/legal/company";
import { LEGAL_POLICY_META } from "@/lib/legal/policy-meta";
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
      lastUpdated={LEGAL_POLICY_META.lastUpdated}
      subtitle={`Effective ${LEGAL_POLICY_META.effectiveDate} · ${LEGAL_ENTITY_DBA}`}
      related={[...LEGAL_RELATED.refunds]}
    >
      <RefundPolicyContent />
    </LegalPageShell>
  );
}
