"use client";

import { LuxuryCard } from "@/components/crm/luxury-card";
import {
  Modal,
  ModalField,
  ModalFooterActions,
  modalInputClass,
} from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export type ContactNote = {
  id: string;
  body: string;
  contact_id: string | null;
  created_at: string;
  contacts?: { id: string; first_name: string; last_name?: string | null } | null;
};

function contactName(note: ContactNote) {
  if (!note.contacts) return "General";
  return `${note.contacts.first_name} ${note.contacts.last_name ?? ""}`.trim();
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotesPage() {
  const searchParams = useSearchParams();
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notes", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load notes");
      setNotes(data.notes ?? []);
      setError(data.error ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load notes");
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (searchParams.get("new") === "note") setModalOpen(true);
  }, [searchParams]);

  const remove = async (id: string) => {
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (res.ok) void refresh();
  };

  return (
    <div className="luxury-page mx-auto block w-full min-w-0 max-w-[1400px] space-y-6 p-4 sm:p-8">
      <header className="flex w-full flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">Notes</p>
          <h1 className="font-serif text-[36px] font-semibold text-ink">Client notes</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-text">
            Capture showing takeaways, preferences, and follow-ups — linked to a contact or kept
            general.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-rose-gold px-5 py-2.5 text-[14px] font-medium text-ivory hover:bg-rose-gold-deep"
        >
          <Icon name="add" className="text-[18px]" />
          Add note
        </button>
      </header>

      {error ? (
        <p className="rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-[14px] text-error">
          {error}. Run <code className="font-mono">schema-contact-notes.sql</code> in Supabase if
          this table is missing.
        </p>
      ) : null}

      {loading ? (
        <p className="text-taupe">Loading notes…</p>
      ) : notes.length === 0 ? (
        <LuxuryCard padding="lg">
          <p className="text-[15px] text-slate-text">
            No notes yet. Add one from here, a contact profile, or Quick create.
          </p>
        </LuxuryCard>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <LuxuryCard key={note.id} padding="md">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {note.contact_id && note.contacts ? (
                      <Link
                        href={`/dashboard/contacts/${note.contact_id}`}
                        className="text-[13px] font-semibold text-rose-gold-deep hover:underline"
                      >
                        {contactName(note)}
                      </Link>
                    ) : (
                      <span className="text-[13px] font-semibold text-taupe">General</span>
                    )}
                    <span className="text-[12px] text-taupe">{formatWhen(note.created_at)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                    {note.body}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(note.id)}
                  className="rounded-full p-2 text-taupe hover:bg-champagne hover:text-error"
                  aria-label="Delete note"
                >
                  <Icon name="delete" className="text-[18px]" />
                </button>
              </div>
            </LuxuryCard>
          ))}
        </div>
      )}

      <QuickNoteEditor
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => void refresh()}
      />
    </div>
  );
}

function QuickNoteEditor({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [body, setBody] = useState("");
  const [contactId, setContactId] = useState("");
  const [contacts, setContacts] = useState<{ id: string; first_name: string; last_name?: string | null }[]>(
    [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setBody("");
    setContactId("");
    setError(null);
    void fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => setContacts(data.contacts ?? []))
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
        body: JSON.stringify({ body: body.trim(), contactId: contactId || null }),
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
      description="Save a client note — linked to a contact or kept general."
      icon="sticky_note_2"
      size="md"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel={saving ? "Saving…" : "Save note"}
          onPrimary={() => {
            const form = document.getElementById("notes-page-form") as HTMLFormElement | null;
            form?.requestSubmit();
          }}
          primaryDisabled={saving || !body.trim()}
          primaryLoading={saving}
        />
      }
    >
      <form id="notes-page-form" onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <p className="rounded-xl border border-error/20 bg-error/5 px-3 py-2 text-[13px] text-error">
            {error}
          </p>
        ) : null}
        <ModalField label="Note" required>
          <textarea
            className={modalInputClass}
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Showing takeaways, budget, neighborhood prefs…"
            autoFocus
          />
        </ModalField>
        <ModalField label="Link to contact (optional)">
          <select
            className={modalInputClass}
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
          >
            <option value="">General (no contact)</option>
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
