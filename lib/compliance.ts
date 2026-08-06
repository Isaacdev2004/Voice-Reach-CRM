type ConsentRecord = {
  status: string;
  consent_date?: string | null;
  source?: string | null;
  proof_reference?: string | null;
  created_at?: string | null;
};

type ContactForEligibility = {
  phone: string;
  dnc: boolean;
  opt_out_requested?: boolean | null;
  consent_records?: ConsentRecord[];
};

function latestConsent(records: ConsentRecord[] | undefined): ConsentRecord | undefined {
  if (!records?.length) return undefined;
  return [...records].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  })[0];
}

function hasValue(value: string | null | undefined): boolean {
  return Boolean(value && String(value).trim());
}

export function evaluateEligibility(contact: ContactForEligibility) {
  const issues: string[] = [];
  const consent = latestConsent(contact.consent_records);

  if (contact.dnc) issues.push("Internal do-not-contact flag");
  if (contact.opt_out_requested) issues.push("Contact opted out of messaging");
  if (!contact.phone || contact.phone.replace(/[^0-9]/g, "").length < 10) {
    issues.push("Invalid phone number");
  }
  if (!consent || consent.status !== "Yes") issues.push("Consent not documented");
  if (consent?.status === "Yes" && !hasValue(consent.consent_date)) {
    issues.push("Missing consent date");
  }
  if (consent?.status === "Yes" && !hasValue(consent.source)) {
    issues.push("Missing consent source");
  }
  // Proof is recommended; only required when workspace.requireConsentProof is enforced at call site.
  if (consent?.status === "Yes" && !hasValue(consent.proof_reference)) {
    issues.push("Missing consent proof/reference");
  }

  return { eligible: issues.length === 0, issues };
}
