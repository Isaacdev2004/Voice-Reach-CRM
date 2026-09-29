import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { DpaContent } from "@/components/legal/dpa-content";
import { LEGAL_EFFECTIVE_DATE, LEGAL_ENTITY_DBA } from "@/lib/legal/company";
import { LEGAL_RELATED } from "@/lib/legal/links";

export const metadata: Metadata = {
  title: "Data Processing Agreement | ARI",
  description: `Data Processing Agreement (DPA) for ARI, operated by ${LEGAL_ENTITY_DBA}.`,
  robots: { index: true, follow: true },
};

export default function DpaPage() {
  return (
    <LegalPageShell
      title="Data Processing Agreement"
      lastUpdated={LEGAL_EFFECTIVE_DATE}
      subtitle={`Effective ${LEGAL_EFFECTIVE_DATE} · ${LEGAL_ENTITY_DBA}`}
      related={[...LEGAL_RELATED.dpa]}
    >
      <DpaContent />
    </LegalPageShell>
  );
}
