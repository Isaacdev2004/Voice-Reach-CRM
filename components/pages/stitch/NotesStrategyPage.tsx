"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { freeformDocument, titleFromFreeform } from "@/lib/notes/freeform";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type NoteKind = "note" | "strategy" | "goal";

export type NoteRow = {
  id: string;
  kind: NoteKind;
  title: string;
  body: string;
  contact_id?: string | null;
  created_at: string;
  updated_at?: string;
  contacts?: { id: string; first_name: string; last_name?: string | null } | null;
};

const TABS: { id: NoteKind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "note", label: "Notes" },
  { id: "strategy", label: "Strategy" },
  { id: "goal", label: "Goals" },
];

function previewLine(note: NoteRow) {
  const doc = freeformDocument(note.title, note.body);
  const lines = doc
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines[1] || lines[0] || "Empty note";
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function kindLabel(kind: NoteKind | "all") {
  if (kind === "all") return "notes";
  if (kind === "note") return "notes";
  if (kind === "strategy") return "strategy notes";
  return "goals";
}

export function NotesStrategyPage() {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<NoteKind | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [kind, setKind] = useState<NoteKind>("note");
  const [contactId, setContactId] = useState("");
  const [contacts, setContacts] = useState<
    { id: string; first_name: string; last_name?: string | null }[]
  >([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<number | null>(null);
  const creatingRef = useRef(false);
  const selectedIdRef = useRef<string | null>(null);
  const kindRef = useRef<NoteKind>("note");
  const contactIdRef = useRef("");
  const draftTextRef = useRef("");

  selectedIdRef.current = selectedId;
  kindRef.current = kind;
  contactIdRef.current = contactId;
  draftTextRef.current = draftText;

  const filtered = useMemo(
    () => (tab === "all" ? notes : notes.filter((n) => n.kind === tab)),
    [notes, tab],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notes", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load notes");
      const list = (data.notes ?? []) as NoteRow[];
      setNotes(list);
      setError(typeof data.error === "string" ? data.error : null);
      return list;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load notes");
      setNotes([]);
      return [] as NoteRow[];
    } finally {
      setLoading(false);
    }
  }, []);

  const openNote = useCallback((note: NoteRow) => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setSelectedId(note.id);
    selectedIdRef.current = note.id;
    const doc = freeformDocument(note.title, note.body);
    setDraftText(doc);
    draftTextRef.current = doc;
    setKind(note.kind);
    kindRef.current = note.kind;
    setContactId(note.contact_id ?? "");
    contactIdRef.current = note.contact_id ?? "";
    setSaveState("idle");
    setSaveError(null);
    window.setTimeout(() => textareaRef.current?.focus(), 40);
  }, []);

  const startNew = useCallback((forTab?: NoteKind | "all") => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const nextKind = !forTab || forTab === "all" ? "note" : forTab;
    setSelectedId(null);
    selectedIdRef.current = null;
    setDraftText("");
    draftTextRef.current = "";
    setKind(nextKind);
    kindRef.current = nextKind;
    setContactId("");
    contactIdRef.current = "";
    setSaveState("idle");
    setSaveError(null);
    window.setTimeout(() => textareaRef.current?.focus(), 40);
  }, []);

  useEffect(() => {
    void refresh().then((list) => {
      if (list[0]) openNote(list[0]);
      else startNew("all");
    });
    void fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => setContacts(data.contacts ?? []))
      .catch(() => setContacts([]));
  }, [refresh, openNote, startNew]);

  // When filter tab changes, only keep the editor on a note that belongs in that tab
  useEffect(() => {
    const currentId = selectedIdRef.current;
    if (currentId) {
      const stillVisible = filtered.some((n) => n.id === currentId);
      if (stillVisible) return;
    }
    if (filtered[0]) openNote(filtered[0]);
    else startNew(tab);
  }, [tab, filtered, openNote, startNew]);

  const persist = useCallback(async () => {
    const text = draftTextRef.current;
    const nextKind = kindRef.current;
    const nextContactId = contactIdRef.current;
    let id = selectedIdRef.current;
    const trimmed = text.trim();
    if (!trimmed) return;

    setSaveState("saving");
    setSaveError(null);
    try {
      if (!id) {
        if (creatingRef.current) return;
        creatingRef.current = true;
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: text,
            kind: nextKind,
            contactId: nextContactId || null,
          }),
        });
        const data = await res.json();
        creatingRef.current = false;
        if (!res.ok) throw new Error(data.error ?? "Could not save");
        const note = data.note as NoteRow;
        setNotes((prev) => [note, ...prev.filter((n) => n.id !== note.id)]);
        setSelectedId(note.id);
        selectedIdRef.current = note.id;
        setSaveState("saved");
        return;
      }

      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: text,
          kind: nextKind,
          contactId: nextContactId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save");
      const note = data.note as NoteRow;
      setNotes((prev) => {
        const rest = prev.filter((n) => n.id !== note.id);
        return [note, ...rest];
      });
      setSaveState("saved");
    } catch (e) {
      creatingRef.current = false;
      setSaveState("error");
      setSaveError(e instanceof Error ? e.message : "Could not save");
    }
  }, []);

  const scheduleSave = () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void persist();
    }, 650);
  };

  const remove = async (id: string) => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedIdRef.current === id) startNew(tab);
  };

  const insertChecklist = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const insert = start === 0 || draftText[start - 1] === "\n" ? "- [ ] " : "\n- [ ] ";
    const next = draftText.slice(0, start) + insert + draftText.slice(end);
    setDraftText(next);
    draftTextRef.current = next;
    scheduleSave();
    window.setTimeout(() => {
      el.focus();
      const pos = start + insert.length;
      el.setSelectionRange(pos, pos);
    }, 0);
  };

  const liveTitle = titleFromFreeform(draftText);

  return (
    <div className="luxury-page mx-auto flex h-[calc(100vh-7rem)] min-h-[520px] w-full max-w-[1100px] flex-col gap-4 p-4 sm:p-6">
      <div className="flex shrink-0 items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
            Thinking
          </p>
          <h1 className="mt-1 font-serif text-[28px] font-semibold text-ink sm:text-[34px]">
            Notes & Strategy
          </h1>
          <p className="mt-1 text-[14px] text-slate-text">
            Freeform like Apple Notes — first line is the title. Auto-saves as you type.
          </p>
        </div>
        <button
          type="button"
          onClick={() => startNew(tab)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-rose-gold-deep px-5 py-2.5 text-[14px] font-medium text-ivory shadow-none outline-none ring-0 focus:shadow-none focus:outline-none focus:ring-0 focus-visible:shadow-none focus-visible:outline-none focus-visible:ring-0"
        >
          <Icon name="edit_square" className="text-[18px]" />
          New {tab === "goal" ? "goal" : tab === "strategy" ? "strategy" : "note"}
        </button>
      </div>

      {error ? (
        <p className="shrink-0 rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-[14px] text-error">
          {error.includes("contact_notes") ||
          error.includes("schema") ||
          error.toLowerCase().includes("does not exist")
            ? "Notes storage isn’t set up yet. Run the Notes SQL setup once, then refresh."
            : error}
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 overflow-hidden rounded-2xl border border-outline-variant/15 bg-ivory shadow-card md:grid-cols-[260px_1fr]">
        <aside className="flex min-h-0 flex-col border-b border-outline-variant/15 md:border-b-0 md:border-r">
          <div className="flex gap-1 overflow-x-auto border-b border-outline-variant/10 p-2">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-[12px] font-medium",
                  tab === item.id ? "bg-champagne text-ink" : "text-taupe hover:text-ink",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <p className="p-4 text-[13px] text-taupe">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-[13px] leading-relaxed text-taupe">
                No {kindLabel(tab)} here yet. Tap New to create one in this folder.
              </p>
            ) : (
              <ul>
                {filtered.map((note) => {
                  const active = note.id === selectedId;
                  return (
                    <li key={note.id}>
                      <button
                        type="button"
                        onClick={() => openNote(note)}
                        className={cn(
                          "w-full border-b border-outline-variant/10 px-4 py-3 text-left transition-colors",
                          active ? "bg-champagne/70" : "hover:bg-cream",
                        )}
                      >
                        <p className="truncate font-serif text-[16px] font-semibold text-ink">
                          {note.title || "Untitled"}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] text-taupe">
                          {previewLine(note)}
                        </p>
                        <p className="mt-1 text-[11px] text-taupe/80">
                          {formatWhen(note.updated_at || note.created_at)} ·{" "}
                          {note.kind === "note"
                            ? "Note"
                            : note.kind === "strategy"
                              ? "Strategy"
                              : "Goal"}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col bg-cream/40">
          <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant/10 px-3 py-2">
            <label className="flex items-center gap-1.5 text-[11px] text-taupe">
              Type
              <select
                value={kind}
                onChange={(e) => {
                  const next = e.target.value as NoteKind;
                  setKind(next);
                  kindRef.current = next;
                  // Keep list filter in sync so the note doesn’t “vanish” or stick wrongly
                  if (tab !== "all") setTab(next);
                  scheduleSave();
                }}
                className="rounded-lg border border-outline-variant/20 bg-ivory px-2 py-1.5 text-[12px] text-ink"
              >
                <option value="note">Note</option>
                <option value="strategy">Strategy</option>
                <option value="goal">Goal</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-[11px] text-taupe">
              Client
              <select
                value={contactId}
                onChange={(e) => {
                  const next = e.target.value;
                  setContactId(next);
                  contactIdRef.current = next;
                  scheduleSave();
                }}
                className="max-w-[160px] rounded-lg border border-outline-variant/20 bg-ivory px-2 py-1.5 text-[12px] text-ink"
              >
                <option value="">None</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {`${c.first_name} ${c.last_name ?? ""}`.trim()}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={insertChecklist}
              className="rounded-lg border border-outline-variant/20 bg-ivory px-2.5 py-1.5 text-[12px] text-ink hover:bg-champagne"
              title="Insert checklist item"
            >
              ☐ Checklist
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-taupe">
                {saveState === "saving"
                  ? "Saving…"
                  : saveState === "saved"
                    ? "Saved"
                    : saveState === "error"
                      ? (saveError ?? "Save failed")
                      : liveTitle !== "Untitled"
                        ? liveTitle
                        : "Start typing…"}
              </span>
              {selectedId ? (
                <button
                  type="button"
                  onClick={() => void remove(selectedId)}
                  className="rounded-lg p-1.5 text-taupe hover:bg-error/10 hover:text-error"
                  aria-label="Delete note"
                >
                  <Icon name="delete" className="text-[18px]" />
                </button>
              ) : null}
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={draftText}
            onChange={(e) => {
              setDraftText(e.target.value);
              draftTextRef.current = e.target.value;
              scheduleSave();
            }}
            onBlur={() => {
              if (saveTimer.current) {
                window.clearTimeout(saveTimer.current);
                saveTimer.current = null;
              }
              void persist();
            }}
            placeholder={"Title\n\nStart writing freely…\n\n- [ ] Optional checklist item"}
            className="min-h-0 flex-1 resize-none border-0 bg-transparent px-5 py-6 font-serif text-[20px] leading-relaxed text-ink shadow-none outline-none ring-0 placeholder:text-taupe/50 focus:border-0 focus:shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 sm:px-8 sm:text-[22px]"
            spellCheck
          />
        </section>
      </div>
    </div>
  );
}
