"use client";

import { modalInputClass } from "@/components/crm/modal";
import { safeFetch } from "@/lib/api-response";
import { evaluateEligibility } from "@/lib/compliance";
import { useState } from "react";

type ContactRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  eligibility: { eligible: boolean; issues: string[] };
  consent_records?: Array<{
    status: string;
    consent_date?: string | null;
    source?: string | null;
    proof_reference?: string | null;
    created_at?: string | null;
  }>;
  dnc?: boolean;
};

type CompleteConsentInlineProps = {
  contact: ContactRow;
  onUpdated: (contact: ContactRow) => void;
};

const today = () => new Date().toISOString().slice(0, 10);

/** Lets agents finish missing consent fields without leaving Activate / Add people. */
export function CompleteConsentInline({ contact, onUpdated }: CompleteConsentInlineProps) {
  const [open, setOpen] = useState(false);
  const [consentDate, setConsentDate] = useState(today());
  const [consentSource, setConsentSource] = useState("Documented opt-in");
  const [proof, setProof] = useState("Agent confirmed");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsConsentFix = contact.eligibility.issues.some(
    (issue) =>
      issue.includes("consent") ||
      issue.includes("Consent") ||
      issue.includes("proof"),
  );

  if (!needsConsentFix || contact.eligibility.eligible) return null;

  const handleSave = async () => {
    if (!consentDate || !consentSource.trim() || !proof.trim()) {
      setError("Date, source, and proof are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const envelope = await safeFetch<{ contact: ContactRow }>("/api/contacts/" + contact.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consent: "Yes",
        consentDate,
        consentSource: consentSource.trim(),
        proof: proof.trim(),
      }),
    });
    setSaving(false);
    if (!envelope.success) {
      setError(envelope.error);
      return;
    }
    const updated = envelope.data.contact;
    const withEligibility: ContactRow = {
      ...updated,
      eligibility: evaluateEligibility({
        phone: updated.phone ?? "",
        dnc: Boolean(updated.dnc),
        consent_records: updated.consent_records,
      }),
    };
    onUpdated(withEligibility);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="mt-1 text-[12px] font-medium text-rose-gold-deep hover:underline"
      >
        Complete consent to enroll →
      </button>
    );
  }

  return (
    <div
      className="mt-2 space-y-2 rounded-lg border border-outline-variant/20 bg-cream/80 p-3"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <p className="text-[12px] font-medium text-ink">Document consent for this contact</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block text-[11px] text-taupe">
          Date
          <input
            type="date"
            className={`${modalInputClass} mt-1 py-1.5 text-[13px]`}
            value={consentDate}
            onChange={(e) => setConsentDate(e.target.value)}
          />
        </label>
        <label className="block text-[11px] text-taupe">
          Source
          <input
            className={`${modalInputClass} mt-1 py-1.5 text-[13px]`}
            value={consentSource}
            onChange={(e) => setConsentSource(e.target.value)}
            placeholder="Zillow / website form"
          />
        </label>
        <label className="block text-[11px] text-taupe">
          Proof
          <input
            className={`${modalInputClass} mt-1 py-1.5 text-[13px]`}
            value={proof}
            onChange={(e) => setProof(e.target.value)}
            placeholder="Form export / call note"
          />
        </label>
      </div>
      {error ? <p className="text-[12px] text-error">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="rounded-full bg-rose-gold px-3 py-1.5 text-[12px] font-medium text-ivory disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save & make eligible"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-outline-variant/30 px-3 py-1.5 text-[12px] text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
