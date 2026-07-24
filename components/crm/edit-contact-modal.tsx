"use client";

import {
  Modal,
  ModalField,
  ModalFooterActions,
  modalInputClass,
} from "@/components/crm/modal";
import type { ApiContact } from "@/lib/hooks/use-contacts";
import { CONTACT_TYPE_OPTIONS } from "@/lib/contacts/lifecycle";
import { humanizeDatabaseError } from "@/lib/supabase-errors";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type EditContactModalProps = {
  contact: ApiContact | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onDeleted?: () => void;
};

const CONSENT_SOURCE_OPTIONS = [
  "Website form",
  "Zillow",
  "Verbal opt-in",
  "SMS reply",
  "Email confirmation",
  "Event / open house",
  "Partner referral",
  "Signed agreement",
  "Other",
];

function latestConsent(contact: ApiContact) {
  const records = [...(contact.consent_records ?? [])];
  records.sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });
  return records[0];
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  // Accept YYYY-MM-DD or ISO timestamps
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function EditContactModal({
  contact,
  open,
  onClose,
  onSuccess,
  onDeleted,
}: EditContactModalProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    type: "Cold Lead",
    source: "",
    notes: "",
    dnc: false,
    consent: "Unknown" as "Yes" | "No" | "Unknown",
    consentDate: "",
    consentSource: "",
    proof: "",
  });

  useEffect(() => {
    if (!contact || !open) return;
    const rec = latestConsent(contact);
    setForm({
      firstName: contact.first_name ?? "",
      lastName: contact.last_name ?? "",
      phone: contact.phone ?? "",
      email: contact.email ?? "",
      type: contact.type ?? "Cold Lead",
      source: contact.source ?? "",
      notes: contact.notes ?? "",
      dnc: Boolean(contact.dnc),
      consent: (rec?.status as "Yes" | "No" | "Unknown") || "Unknown",
      consentDate: toDateInput(rec?.consent_date),
      consentSource: rec?.source ?? "",
      proof: rec?.proof_reference ?? "",
    });
    setError(null);
  }, [contact, open]);

  if (!contact) return null;

  const consentYes = form.consent === "Yes";

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!form.firstName.trim()) {
      setError("First name is required.");
      return;
    }
    if (!form.phone.trim() || form.phone.replace(/\D/g, "").length < 7) {
      setError("Enter a valid phone number (at least 7 digits).");
      return;
    }
    if (consentYes) {
      if (!form.consentDate) {
        setError("Consent date is required when consent is Yes.");
        return;
      }
      if (!form.consentSource.trim()) {
        setError("Consent source is required when consent is Yes (where they opted in).");
        return;
      }
      if (!form.proof.trim()) {
        setError("Proof reference is required when consent is Yes (form ID, SMS log, etc.).");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          type: form.type,
          source: form.source.trim(),
          notes: form.notes.trim(),
          dnc: form.dnc,
          consent: form.consent,
          consentDate: form.consentDate || undefined,
          consentSource: form.consentSource.trim() || undefined,
          proof: form.proof.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          humanizeDatabaseError((data as { error?: string }).error ?? "Could not update contact"),
        );
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update contact");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const name = `${form.firstName} ${form.lastName}`.trim();
    if (!confirm(`Delete ${name || "this contact"}? This cannot be undone.`)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          humanizeDatabaseError((data as { error?: string }).error ?? "Could not delete contact"),
        );
      }
      onDeleted?.();
      onClose();
      router.push("/dashboard/contacts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete contact");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit contact"
      description="Update relationship details and consent. Consent source and proof are required when consent is Yes."
      icon="edit"
      size="lg"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel="Save changes"
          onPrimary={() => void handleSubmit()}
          primaryDisabled={submitting || deleting}
          primaryLoading={submitting}
        />
      }
    >
      <form id="edit-contact-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        {error ? (
          <p className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-[14px] text-error">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <ModalField label="First name" required>
            <input
              className={modalInputClass}
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              required
            />
          </ModalField>
          <ModalField label="Last name">
            <input
              className={modalInputClass}
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            />
          </ModalField>
          <ModalField label="Phone" required>
            <input
              className={modalInputClass}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              required
            />
          </ModalField>
          <ModalField label="Email">
            <input
              type="email"
              className={modalInputClass}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </ModalField>
          <ModalField label="Contact type">
            <select
              className={modalInputClass}
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {CONTACT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </ModalField>
          <ModalField label="Lead source">
            <input
              className={modalInputClass}
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              placeholder="e.g. Referral, Zillow, Open house"
            />
          </ModalField>
        </div>

        <div className="rounded-2xl border border-outline-variant/15 bg-cream/40 p-4 space-y-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wider text-taupe">
              Consent (TCPA)
            </p>
            <p className="mt-1 text-[13px] text-slate-text">
              When consent is <strong>Yes</strong>, fill date, source, and proof — they cannot stay
              blank for campaign eligibility.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ModalField label="Consent status" required>
              <select
                className={modalInputClass}
                value={form.consent}
                onChange={(e) =>
                  setForm((f) => ({ ...f, consent: e.target.value as typeof f.consent }))
                }
              >
                <option value="Yes">Yes — opted in</option>
                <option value="No">No — do not contact</option>
                <option value="Unknown">Unknown — needs review</option>
              </select>
            </ModalField>
            <ModalField label="Consent date" required={consentYes}>
              <input
                type="date"
                className={modalInputClass}
                value={form.consentDate}
                onChange={(e) => setForm((f) => ({ ...f, consentDate: e.target.value }))}
                required={consentYes}
              />
            </ModalField>
            <ModalField label="Consent source" required={consentYes}>
              <input
                className={modalInputClass}
                list="consent-source-options"
                value={form.consentSource}
                onChange={(e) => setForm((f) => ({ ...f, consentSource: e.target.value }))}
                placeholder="Where they opted in"
                required={consentYes}
              />
              <datalist id="consent-source-options">
                {CONSENT_SOURCE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </ModalField>
            <ModalField label="Proof reference" required={consentYes}>
              <input
                className={modalInputClass}
                value={form.proof}
                onChange={(e) => setForm((f) => ({ ...f, proof: e.target.value }))}
                placeholder="e.g. Form #4821, SMS thread, signed PDF"
                required={consentYes}
              />
            </ModalField>
          </div>
        </div>

        <ModalField label="Notes">
          <textarea
            className={`${modalInputClass} min-h-[80px] resize-none py-3`}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </ModalField>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={form.dnc}
            onChange={(e) => setForm((f) => ({ ...f, dnc: e.target.checked }))}
            className="rounded border-outline-variant"
          />
          <span className="text-[14px] text-ink">Do not contact (DNC)</span>
        </label>

        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={deleting || submitting}
          className="text-[13px] font-medium text-error hover:underline disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete contact"}
        </button>
      </form>
    </Modal>
  );
}
