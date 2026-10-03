import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { AcceptableUseContent } from "@/components/legal/acceptable-use-content";
import { LEGAL_ENTITY_DBA } from "@/lib/legal/company";
import { LEGAL_POLICY_META } from "@/lib/legal/policy-meta";
import { LEGAL_RELATED } from "@/lib/legal/links";

export const metadata: Metadata = {
  title: "Acceptable Use Policy | ARI",
  description: `Acceptable Use Policy for ARI, operated by ${LEGAL_ENTITY_DBA}.`,
  robots: { index: true, follow: true },
};

export default function AcceptableUsePage() {
  return (
    <LegalPageShell
      title="Acceptable Use Policy"
      lastUpdated={LEGAL_POLICY_META.lastUpdated}
      subtitle={`Effective ${LEGAL_POLICY_META.effectiveDate} · ${LEGAL_ENTITY_DBA}`}
      related={[...LEGAL_RELATED.acceptableUse]}
    >
      <AcceptableUseContent />
    </LegalPageShell>
  );
}
