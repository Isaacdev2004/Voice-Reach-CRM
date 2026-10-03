import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { PrivacyPolicyContent } from "@/components/legal/privacy-policy-content";
import { LEGAL_ENTITY_DBA } from "@/lib/legal/company";
import { LEGAL_POLICY_META } from "@/lib/legal/policy-meta";
import { LEGAL_RELATED } from "@/lib/legal/links";

export const metadata: Metadata = {
  title: "Privacy Policy | ARI",
  description: `Privacy practices for ARI, operated by ${LEGAL_ENTITY_DBA}.`,
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="Privacy Policy"
      lastUpdated={LEGAL_POLICY_META.lastUpdated}
      subtitle={`Effective ${LEGAL_POLICY_META.effectiveDate} · ${LEGAL_ENTITY_DBA}`}
      related={[...LEGAL_RELATED.privacy]}
    >
      <PrivacyPolicyContent />
    </LegalPageShell>
  );
}
