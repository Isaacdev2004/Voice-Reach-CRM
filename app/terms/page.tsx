import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { TermsOfServiceContent } from "@/components/legal/terms-of-service-content";
import { LEGAL_ENTITY_DBA } from "@/lib/legal/company";
import { LEGAL_POLICY_META } from "@/lib/legal/policy-meta";
import { LEGAL_RELATED } from "@/lib/legal/links";

export const metadata: Metadata = {
  title: "Terms of Service | ARI",
  description: `Terms of Service for ARI, operated by ${LEGAL_ENTITY_DBA}.`,
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      lastUpdated={LEGAL_POLICY_META.lastUpdated}
      subtitle={`Effective ${LEGAL_POLICY_META.effectiveDate} · ${LEGAL_ENTITY_DBA}`}
      related={[...LEGAL_RELATED.terms]}
    >
      <TermsOfServiceContent />
    </LegalPageShell>
  );
}
