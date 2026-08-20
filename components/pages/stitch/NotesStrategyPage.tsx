"use client";

import { LuxuryCard } from "@/components/crm/luxury-card";
import {
  Modal,
  ModalField,
  ModalFooterActions,
  modalInputClass,
} from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { useEffect, useMemo, useState } from "react";

export type NoteKind = "note" | "strategy" | "goal";

export type NoteRow = {
  id: string;
  kind: NoteKind;
  title: string;
  body: string;
  contact_id?: string | null;
  created_at: string;
  contacts?: { id: string; first_name: string; last_name?: string | null } | null;
};

const TABS: { id: NoteKind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "note", label: "Note" },
  { id: "strategy", label: "Strategy" },
  { id: "goal", label: "Goal" },
];

const KIND_ICON: Record<NoteKind, string> = {
  note: "edit_note",
  strategy: "lightbulb",
  goal: "flag",
};

function kindLabel(kind: NoteKind) {
  return kind === "note" ? "Note" : kind === "strategy" ? "Strategy" : "Goal";
}

export function NotesStrategyPage() {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<NoteKind | "all">("note");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NoteRow | null>(null);

  const refresh = async () => {
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
  };

  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(
    () => (tab === "all" ? notes : notes.filter((n) => n.kind === tab)),
    [notes, tab],
  );

  const remove = async (id: string) => {
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (res.ok) void refresh();
  };

  return (
    <div className="luxury-page mx-auto w-full max-w-[900px] space-y-8 p-4 sm:p-8">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">Thinking</p>
        <h1 className="mt-1 font-serif text-[36px] font-semibold text-ink">Notes & Strategy</h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-text">
          Capture ideas, shape your strategy, and set goals — all in one refined space.
        </p>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-gold-deep px-6 py-3.5 text-[15px] font-medium text-ivory hover:opacity-95 sm:w-auto"
        >
          <Icon name="add" className="text-[18px]" />
          New Entry
        </button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-champagne p-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors",
                tab === item.id ? "bg-ivory text-ink shadow-sm" : "text-taupe hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="text-[13px] font-medium text-rose-gold-deep hover:underline"
        >
          + Add {tab === "all" ? "Note" : kindLabel(tab as NoteKind)}
        </button>
      </div>

      {error ? (
        <p className="rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-[14px] text-error">
          {error.includes("contact_notes") || error.includes("schema")
            ? "Notes table isn’t in Supabase yet — run supabase/schema-contact-notes.sql, then refresh."
            : error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-taupe">Loading entries…</p>
      ) : filtered.length === 0 ? (
        <LuxuryCard>
          <p className="text-[15px] text-slate-text">
            No {tab === "all" ? "entries" : `${kindLabel(tab as NoteKind).toLowerCase()}s`} yet. Add
            one to start capturing your thinking.
          </p>
        </LuxuryCard>
      ) : (
        <ul className="space-y-3">
          {filtered.map((note) => (
            <li key={note.id}>
              <LuxuryCard padding="md" className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-gold/15 text-rose-gold-deep">
                  <Icon name={KIND_ICON[note.kind]} className="text-[20px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-[20px] font-semibold text-ink">{note.title}</p>
                      <p className="mt-1 text-[14px] leading-relaxed text-slate-text">{note.body}</p>
                      {note.contacts ? (
                        <p className="mt-2 text-[12px] text-taupe">
                          Linked to {note.contacts.first_name} {note.contacts.last_name ?? ""}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        aria-label="Edit"
                        onClick={() => {
                          setEditing(note);
                          setModalOpen(true);
                        }}
                        className="rounded-full p-2 text-taupe hover:bg-champagne hover:text-ink"
                      >
                        <Icon name="edit" className="text-[18px]" />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete"
                        onClick={() => void remove(note.id)}
                        className="rounded-full p-2 text-taupe hover:bg-error/10 hover:text-error"
                      >
                        <Icon name="delete" className="text-[18px]" />
                      </button>
                    </div>
                  </div>
                </div>
              </LuxuryCard>
            </li>
          ))}
        </ul>
      )}

      <NoteEntryModal
        open={modalOpen}
        initial={editing}
        defaultKind={tab === "all" ? "note" : tab}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={() => void refresh()}
      />
    </div>
  );
}

function NoteEntryModal({
  open,
  initial,
  defaultKind,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: NoteRow | null;
  defaultKind: NoteKind;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<NoteKind>("note");
  const [contactId, setContactId] = useState("");
  const [contacts, setContacts] = useState<{ id: string; first_name: string; last_name?: string | null }[]>(
    [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setBody(initial?.body ?? "");
    setKind(initial?.kind ?? defaultKind);
    setContactId(initial?.contact_id ?? "");
    setError(null);
    void fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => setContacts(data.contacts ?? []))
      .catch(() => setContacts([]));
  }, [open, initial, defaultKind]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        kind,
        contactId: contactId || null,
      };
      const res = await fetch(initial ? `/api/notes/${initial.id}` : "/api/notes", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit entry" : "New entry"}
      description="Notes, strategy, or goals — linked to a client if you want."
      icon="edit_note"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel={saving ? "Saving…" : "Save"}
          onPrimary={() => {
            const form = document.getElementById("note-entry-form") as HTMLFormElement | null;
            form?.requestSubmit();
          }}
          primaryDisabled={saving || !title.trim() || !body.trim()}
          primaryLoading={saving}
        />
      }
    >
      <form id="note-entry-form" onSubmit={submit} className="space-y-4">
        {error ? (
          <p className="rounded-xl border border-error/20 bg-error/5 px-3 py-2 text-[13px] text-error">
            {error}
          </p>
        ) : null}
        <ModalField label="Type">
          <select className={modalInputClass} value={kind} onChange={(e) => setKind(e.target.value as NoteKind)}>
            <option value="note">Note</option>
            <option value="strategy">Strategy</option>
            <option value="goal">Goal</option>
          </select>
        </ModalField>
        <ModalField label="Title" required>
          <input className={modalInputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </ModalField>
        <ModalField label="Details" required>
          <textarea
            className={cn(modalInputClass, "h-auto py-3")}
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </ModalField>
        <ModalField label="Link to client (optional)">
          <select className={modalInputClass} value={contactId} onChange={(e) => setContactId(e.target.value)}>
            <option value="">None</option>
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
