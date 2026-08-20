"use client";

import {
  Modal,
  ModalField,
  ModalFooterActions,
  modalInputClass,
} from "@/components/crm/modal";
import { useEffect, useState } from "react";

type ContactOption = {
  id: string;
  first_name: string;
  last_name?: string | null;
};

type QuickNoteModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function QuickNoteModal({ open, onClose, onSaved }: QuickNoteModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [contactId, setContactId] = useState("");
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setBody("");
    setContactId("");
    setError(null);

    void fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => {
        setContacts((data.contacts ?? []) as ContactOption[]);
      })
      .catch(() => setContacts([]));
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || body.trim().slice(0, 80),
          body: body.trim(),
          kind: "note",
          contactId: contactId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save note");

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add note"
      description="Saved under Notes & Strategy — link to a client if you want."
      icon="sticky_note_2"
      size="md"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel={saving ? "Saving…" : "Save note"}
          onPrimary={() => {
            const form = document.getElementById("quick-note-form") as HTMLFormElement | null;
            form?.requestSubmit();
          }}
          primaryDisabled={saving || !body.trim()}
          primaryLoading={saving}
        />
      }
    >
      <form id="quick-note-form" onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <p className="rounded-xl border border-error/20 bg-error/5 px-3 py-2 text-[13px] text-error">
            {error}
          </p>
        ) : null}

        <ModalField label="Title">
          <input
            className={modalInputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional — defaults to first line"
          />
        </ModalField>

        <ModalField label="Note" required>
          <textarea
            className={modalInputClass}
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Meeting takeaways, client preferences, follow-up ideas…"
            autoFocus
          />
        </ModalField>

        <ModalField label="Link to contact (optional)">
          <select
            className={modalInputClass}
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
          >
            <option value="">Workspace note</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {`${c.first_name} ${c.last_name ?? ""}`.trim()}
              </option>
            ))}
          </select>
        </ModalField>
      </form>
    </Modal>
  );
}
