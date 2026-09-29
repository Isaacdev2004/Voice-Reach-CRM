import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { AcceptableUseContent } from "@/components/legal/acceptable-use-content";
import { LEGAL_EFFECTIVE_DATE, LEGAL_ENTITY_DBA } from "@/lib/legal/company";
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
      lastUpdated={LEGAL_EFFECTIVE_DATE}
      subtitle={`Effective ${LEGAL_EFFECTIVE_DATE} · ${LEGAL_ENTITY_DBA}`}
      related={[...LEGAL_RELATED.acceptableUse]}
    >
      <AcceptableUseContent />
    </LegalPageShell>
  );
}
