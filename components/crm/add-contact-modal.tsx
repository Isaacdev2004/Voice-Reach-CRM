"use client";

import {
  Modal,
  ModalField,
  ModalFooterActions,
  modalInputClass,
} from "@/components/crm/modal";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AddContactModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  openProfileAfterSave?: boolean;
};

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-taupe">{title}</h3>
      {children}
    </section>
  );
}

export function AddContactModal({
  open,
  onClose,
  onSuccess,
  openProfileAfterSave = true,
}: AddContactModalProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    source: "Manual entry",
    consent: "Unknown" as "Yes" | "No" | "Unknown",
    notes: "",
  });

  const reset = () => {
    setForm({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      source: "Manual entry",
      consent: "Unknown",
      notes: "",
    });
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.firstName.trim() || !form.phone.trim()) {
      setError("First name and phone are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          source: form.source.trim() || "Manual entry",
          consent: form.consent,
          notes: form.notes.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save contact");

      const contactId = data.contact?.id as string | undefined;
      reset();
      onSuccess?.();
      onClose();
      if (openProfileAfterSave && contactId) {
        router.push(`/dashboard/contacts/${contactId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save contact");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add contact"
      description="Create a new relationship. Consent is saved for compliance."
      icon="person_add"
      size="lg"
      footer={
        <ModalFooterActions
          onCancel={handleClose}
          primaryLabel="Save contact"
          primaryType="submit"
          formId="add-contact-form"
          primaryDisabled={submitting}
          primaryLoading={submitting}
        />
      }
    >
      <form id="add-contact-form" onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Identity">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ModalField label="First name" required>
              <input
                className={modalInputClass}
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                placeholder="Elena"
                autoFocus
              />
            </ModalField>
            <ModalField label="Last name">
              <input
                className={modalInputClass}
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                placeholder="Reyes"
              />
            </ModalField>
          </div>
        </FormSection>

        <FormSection title="Reach">
          <ModalField label="Phone" required>
            <input
              className={modalInputClass}
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+1 (555) 000-0000"
            />
          </ModalField>
          <ModalField label="Email">
            <input
              className={modalInputClass}
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="name@example.com"
            />
          </ModalField>
        </FormSection>

        <FormSection title="Compliance">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ModalField label="Lead source">
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
                  setForm((f) => ({ ...f, consent: e.target.value as "Yes" | "No" | "Unknown" }))
                }
              >
                <option value="Yes">Opt-in (Yes)</option>
                <option value="Unknown">Pending (Unknown)</option>
                <option value="No">Opt-out (No)</option>
              </select>
            </ModalField>
          </div>
        </FormSection>

        <ModalField label="Notes">
          <textarea
            className={`${modalInputClass} min-h-[96px] resize-none py-3`}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Goals, preferences, context…"
            rows={3}
          />
        </ModalField>

        {error ? (
          <p
            className="rounded-xl border border-error/20 bg-error-container/25 px-4 py-3 text-[14px] text-error"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
