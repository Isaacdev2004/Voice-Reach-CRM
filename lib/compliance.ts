type ConsentRecord = {
  status: string;
  consent_date?: string | null;
  source?: string | null;
  proof_reference?: string | null;
};

type ContactForEligibility = {
  phone: string;
  dnc: boolean;
  consent_records?: ConsentRecord[];
};

export function evaluateEligibility(contact: ContactForEligibility) {
  const issues: string[] = [];
  const latestConsent = contact.consent_records?.[0];

  if (contact.dnc) issues.push("Internal do-not-contact flag");
  if (!contact.phone || contact.phone.replace(/[^0-9]/g, "").length < 10) issues.push("Invalid phone number");
  if (!latestConsent || latestConsent.status !== "Yes") issues.push("Consent not documented");
  if (latestConsent?.status === "Yes" && !latestConsent.consent_date) issues.push("Missing consent date");
  if (latestConsent?.status === "Yes" && !latestConsent.source) issues.push("Missing consent source");
  if (latestConsent?.status === "Yes" && !latestConsent.proof_reference) issues.push("Missing consent proof/reference");

  return { eligible: issues.length === 0, issues };
}
