import { evaluateEligibility } from "@/lib/compliance";

export type ComplianceIssueSummary = {
  id: string;
  label: string;
  count: number;
  status: "valid" | "pending" | "blocked" | "review";
};

type ConsentRow = {
  status: string;
  consent_date?: string | null;
  source?: string | null;
  proof_reference?: string | null;
  created_at?: string;
};

type ContactRow = {
  id: string;
  phone: string;
  dnc: boolean;
  consent_records?: ConsentRow[];
};

function latestConsent(records?: ConsentRow[]) {
  if (!records?.length) return undefined;
  return [...records].sort(
    (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
  )[0];
}

export type ComplianceScanResult = {
  total: number;
  eligible: number;
  issues: ComplianceIssueSummary[];
  scannedAt: string;
};

export function scanContactsForCompliance(contacts: ContactRow[]): ComplianceScanResult {
  let dncCount = 0;
  let consentNotDocumented = 0;
  let consentDenied = 0;
  let missingProof = 0;
  let invalidPhone = 0;
  let eligible = 0;

  for (const contact of contacts) {
    const consent = latestConsent(contact.consent_records);
    const { eligible: isEligible, issues } = evaluateEligibility({
      phone: contact.phone,
      dnc: contact.dnc,
      consent_records: consent ? [consent] : [],
    });

    if (contact.dnc) dncCount++;
    if (consent?.status === "No") consentDenied++;
    if (!consent || consent.status !== "Yes") consentNotDocumented++;

    const missingProofFields =
      consent?.status === "Yes" &&
      issues.some(
        (i) =>
          i.includes("consent date") ||
          i.includes("consent source") ||
          i.includes("proof"),
      );
    if (missingProofFields) missingProof++;

    if (issues.some((i) => i.includes("Invalid phone"))) invalidPhone++;

    if (isEligible) eligible++;
  }

  const issues = [
    {
      id: "dnc",
      label: "Do-not-contact (DNC) flagged",
      count: dncCount,
      status: "blocked" as const,
    },
    {
      id: "consent_denied",
      label: "Consent declined",
      count: consentDenied,
      status: "blocked" as const,
    },
    {
      id: "consent_missing",
      label: "Consent not documented",
      count: consentNotDocumented,
      status: "pending" as const,
    },
    {
      id: "proof_missing",
      label: "Missing consent date, source, or proof",
      count: missingProof,
      status: "review" as const,
    },
    {
      id: "invalid_phone",
      label: "Invalid phone number",
      count: invalidPhone,
      status: "blocked" as const,
    },
    {
      id: "eligible",
      label: "Eligible for outreach",
      count: eligible,
      status: "valid" as const,
    },
  ].filter((i) => i.id === "eligible" || i.count > 0) satisfies ComplianceIssueSummary[];

  return {
    total: contacts.length,
    eligible,
    issues,
    scannedAt: new Date().toISOString(),
  };
}
