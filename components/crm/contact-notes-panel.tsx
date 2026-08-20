"use client";

import { LuxuryCard } from "@/components/crm/luxury-card";
import { modalInputClass } from "@/components/crm/modal";
import { useCallback, useEffect, useState } from "react";

type NoteRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export function ContactNotesPanel({
  contactId,
  fallback,
  isDemo,
}: {
  contactId: string;
  fallback?: string;
  isDemo?: boolean;
}) {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(!isDemo);
  const [adding, setAdding] = useState(false);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (isDemo) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/notes?contactId=${contactId}`, { cache: "no-store" });
      const data = await res.json();
      setNotes(data.notes ?? []);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [contactId, isDemo]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = async () => {
    if (!body.trim() || isDemo) return;
    setSaving(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: body.trim().slice(0, 80),
          body: body.trim(),
          kind: "note",
          contactId,
        }),
      });
      if (res.ok) {
        setBody("");
        setAdding(false);
        await refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <LuxuryCard padding="lg">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-[20px] font-semibold text-ink">Notes</h2>
        {!isDemo ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-[13px] font-medium text-rose-gold-deep"
          >
            + Add note
          </button>
        ) : null}
      </div>

      {adding ? (
        <div className="mb-4 space-y-2">
          <textarea
            className={modalInputClass}
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What should you remember about this client?"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !body.trim()}
              className="rounded-full bg-rose-gold-deep px-4 py-1.5 text-[13px] font-medium text-ivory disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setBody("");
              }}
              className="rounded-full px-4 py-1.5 text-[13px] text-taupe"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-[14px] text-taupe">Loading notes…</p>
      ) : notes.length === 0 ? (
        <p className="text-[15px] leading-relaxed text-slate-text">
          {fallback || "No notes yet for this relationship."}
        </p>
      ) : (
        <ul className="space-y-4">
          {notes.map((note) => (
            <li key={note.id} className="border-b border-outline-variant/15 pb-3 last:border-0">
              <p className="text-[15px] leading-relaxed text-slate-text">{note.body}</p>
              <p className="mt-1 text-[12px] text-taupe">
                {new Date(note.created_at).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </LuxuryCard>
  );
}
