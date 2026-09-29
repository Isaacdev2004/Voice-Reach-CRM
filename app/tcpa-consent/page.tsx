import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { TcpaConsentContent } from "@/components/legal/tcpa-consent-content";
import { LEGAL_EFFECTIVE_DATE, LEGAL_ENTITY_DBA } from "@/lib/legal/company";
import { LEGAL_RELATED } from "@/lib/legal/links";

export const metadata: Metadata = {
  title: "TCPA Consent & Do-Not-Call Policy | ARI",
  description: `TCPA consent, documentation, and opt-out requirements for ARI customers. Operated by ${LEGAL_ENTITY_DBA}.`,
  robots: { index: true, follow: true },
};

export default function TcpaConsentPage() {
  return (
    <LegalPageShell
      title="TCPA Consent & Do-Not-Call Policy"
      lastUpdated={LEGAL_EFFECTIVE_DATE}
      subtitle={`Effective ${LEGAL_EFFECTIVE_DATE} · ${LEGAL_ENTITY_DBA}`}
      related={[...LEGAL_RELATED.tcpaConsent]}
    >
      <TcpaConsentContent />
    </LegalPageShell>
  );
}
