"use client";

import {
  Modal,
  ModalField,
  ModalFooterActions,
  modalInputClass,
} from "@/components/crm/modal";
import type { ApiContact } from "@/lib/hooks/use-contacts";
import { CONTACT_TYPE_OPTIONS } from "@/lib/contacts/lifecycle";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type EditContactModalProps = {
  contact: ApiContact | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onDeleted?: () => void;
};

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
    const rec = contact.consent_records?.[0];
    setForm({
      firstName: contact.first_name,
      lastName: contact.last_name ?? "",
      phone: contact.phone,
      email: contact.email ?? "",
      type: contact.type ?? "Cold Lead",
      source: contact.source ?? "",
      notes: contact.notes ?? "",
      dnc: contact.dnc ?? false,
      consent: (rec?.status as "Yes" | "No" | "Unknown") ?? "Unknown",
      consentDate: "",
      consentSource: "",
      proof: "",
    });
    setError(null);
  }, [contact, open]);

  if (!contact) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
          consentSource: form.consentSource || undefined,
          proof: form.proof || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not update contact");
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
      if (!res.ok) throw new Error(data.error ?? "Could not delete contact");
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
      description="Update details and consent. A new consent record is added when consent fields change."
      icon="edit"
      size="lg"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel="Save changes"
          primaryType="submit"
          formId="edit-contact-form"
          primaryDisabled={submitting || deleting}
          primaryLoading={submitting}
        />
      }
    >
      <form id="edit-contact-form" onSubmit={handleSubmit} className="space-y-6">
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
          <ModalField label="Source">
            <input
              className={modalInputClass}
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
            />
          </ModalField>
          <ModalField label="Consent status">
            <select
              className={modalInputClass}
              value={form.consent}
              onChange={(e) =>
                setForm((f) => ({ ...f, consent: e.target.value as typeof f.consent }))
              }
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Unknown">Unknown</option>
            </select>
          </ModalField>
          <ModalField label="Consent date">
            <input
              type="date"
              className={modalInputClass}
              value={form.consentDate}
              onChange={(e) => setForm((f) => ({ ...f, consentDate: e.target.value }))}
            />
          </ModalField>
          <ModalField label="Consent source">
            <input
              className={modalInputClass}
              value={form.consentSource}
              onChange={(e) => setForm((f) => ({ ...f, consentSource: e.target.value }))}
            />
          </ModalField>
          <ModalField label="Proof reference">
            <input
              className={modalInputClass}
              value={form.proof}
              onChange={(e) => setForm((f) => ({ ...f, proof: e.target.value }))}
            />
          </ModalField>
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
