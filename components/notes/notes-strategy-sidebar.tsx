"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { NoteRow } from "@/lib/notes/types";
import { freeformDocument } from "@/lib/notes/freeform";
import { noteListIcon } from "@/lib/notes/filters";
import { useState } from "react";

export type ContactDetail = {
  id: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  notes?: string | null;
};

function previewLine(note: NoteRow) {
  const doc = freeformDocument(note.title, note.body);
  const lines = doc
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines[1] || lines[0] || "Empty note";
}

type NotesStrategySidebarProps = {
  contact: ContactDetail | null;
  contactLoading: boolean;
  goalLines: string[];
  related: NoteRow[];
  onOpenNote: (note: NoteRow) => void;
  onAddGoalLine: (line: string) => void;
};

export function NotesStrategySidebar({
  contact,
  contactLoading,
  goalLines,
  related,
  onOpenNote,
  onAddGoalLine,
}: NotesStrategySidebarProps) {
  const [goalDraft, setGoalDraft] = useState("");

  const contactName = contact
    ? `${contact.first_name} ${contact.last_name ?? ""}`.trim()
    : null;

  return (
    <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto">
      <div className="rounded-2xl border border-outline-variant/15 bg-ivory p-4">
        <h3 className="font-serif text-[18px] font-semibold text-ink">Client context</h3>
        {contactLoading ? (
          <p className="mt-3 text-[13px] text-taupe">Loading…</p>
        ) : contact && contactName ? (
          <div className="mt-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-champagne font-medium text-rose-gold-deep">
                {contact.first_name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{contactName}</p>
                <Link
                  href={`/dashboard/contacts/${contact.id}`}
                  className="text-[12px] font-medium text-rose-gold-deep hover:underline"
                >
                  View client
                </Link>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5 text-[13px] text-slate-text">
              {contact.email ? <li>{contact.email}</li> : null}
              {contact.phone ? <li>{contact.phone}</li> : null}
              {contact.source ? <li>{contact.source}</li> : null}
            </ul>
            {contact.notes ? (
              <p className="mt-3 text-[13px] leading-relaxed text-slate-text">{contact.notes}</p>
            ) : (
              <p className="mt-3 text-[13px] text-taupe">Interested in staying in touch — add context on the contact record.</p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-[13px] text-slate-text">Link a contact in the editor to see client context here.</p>
        )}
      </div>

      <div className="rounded-2xl border border-outline-variant/15 bg-ivory p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-[18px] font-semibold text-ink">Strategy &amp; goals</h3>
          <Icon name="add" className="text-taupe" />
        </div>
        <ul className="mt-3 space-y-2">
          {goalLines.length === 0 ? (
            <li className="text-[13px] text-taupe">Add checklist items in your note, or type a goal below.</li>
          ) : (
            goalLines.map((line) => (
              <li key={line} className="flex items-start gap-2 text-[13px] text-slate-text">
                <Icon name="check_box_outline_blank" className="mt-0.5 shrink-0 text-[18px] text-taupe" />
                {line}
              </li>
            ))
          )}
        </ul>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = goalDraft.trim();
            if (!v) return;
            onAddGoalLine(v);
            setGoalDraft("");
          }}
        >
          <input
            value={goalDraft}
            onChange={(e) => setGoalDraft(e.target.value)}
            placeholder="Add a goal or next step…"
            className="min-w-0 flex-1 rounded-xl border border-outline-variant/20 bg-cream/40 px-3 py-2 text-[13px] outline-none focus:border-rose-gold/40"
          />
        </form>
      </div>

      <div className="rounded-2xl border border-outline-variant/15 bg-ivory p-4">
        <h3 className="font-serif text-[18px] font-semibold text-ink">Related notes</h3>
        {related.length === 0 ? (
          <p className="mt-3 text-[13px] text-taupe">No related notes yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {related.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => onOpenNote(note)}
                  className="flex w-full gap-3 rounded-xl border border-outline-variant/10 bg-cream/30 p-3 text-left hover:bg-champagne/50"
                >
                  <Icon name={noteListIcon(note)} className="shrink-0 text-[20px] text-rose-gold-deep" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{note.title || "Untitled"}</p>
                    <p className="line-clamp-2 text-[12px] text-taupe">{previewLine(note)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
