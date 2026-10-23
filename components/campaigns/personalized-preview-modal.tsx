"use client";
import { useState } from "react";
import { Modal } from "@/components/crm/modal";
import { useContacts } from "@/lib/hooks/use-contacts";
import { safeFetch } from "@/lib/api-response";
import type { CampaignStep } from "@/lib/crm/types";
type Preview = {
  stepId: string;
  channel: string;
  title: string;
  ok: boolean;
  body: string;
  subject: string | null;
  issues: string[];
  scheduledAt: string | null;
  notice: string;
};
export function PersonalizedPreviewModal({
  open,
  onClose,
  steps,
}: {
  open: boolean;
  onClose: () => void;
  steps: CampaignStep[];
}) {
  const { contacts, loading } = useContacts();
  const [contactId, setContactId] = useState("");
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const preview = async () => {
    setBusy(true);
    setError("");
    setPreviews([]);
    const result = await safeFetch<{ previews: Preview[] }>(
      "/api/campaigns/preview",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, steps }),
      },
    );
    setBusy(false);
    if (result.success) setPreviews(result.data.previews);
    else
      setError(
        "Preview unavailable. Check your selected contact and message fields.",
      );
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Personalized message preview"
      description="Review the same subject and body renderer used for delivery. No messages, consent or schedules are changed."
      size="lg"
    >
      <label className="block text-sm text-taupe">
        Preview for contact
        <select
          className="mt-2 w-full rounded-xl border-outline-variant/30"
          value={contactId}
          onChange={(e) => {
            setContactId(e.target.value);
            setPreviews([]);
          }}
        >
          <option value="">
            {loading ? "Loading contacts…" : "Choose an actual contact"}
          </option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.first_name} {c.last_name ?? ""}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="cl-button cl-primary mt-3"
        disabled={busy || !contactId || !steps.length}
        onClick={() => void preview()}
      >
        {busy ? "Preparing…" : "Preview messages"}
      </button>
      {error ? (
        <p role="alert" className="cl-error mt-3">
          {error}
        </p>
      ) : null}
      {previews.map((p) => (
        <section
          key={p.stepId}
          className="mt-4 rounded-xl border border-outline-variant/20 p-4"
        >
          <h3 className="font-serif text-xl">
            {p.title} · {p.channel}
          </h3>
          {p.ok && p.subject ? (
            <p className="mt-2 font-semibold">Subject: {p.subject}</p>
          ) : null}
          <p className="mt-2 whitespace-pre-wrap break-words text-sm">
            {p.ok ? p.body : "This step is not ready to send."}
          </p>
          {p.issues.map((issue) => (
            <p key={issue} className="mt-1 text-sm text-error">
              {issue}
            </p>
          ))}
          <p className="mt-2 text-xs text-taupe">{p.notice}</p>
        </section>
      ))}
    </Modal>
  );
}
