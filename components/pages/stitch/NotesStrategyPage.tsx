"use client";

import {
  NotesStrategySidebar,
  type ContactDetail,
} from "@/components/notes/notes-strategy-sidebar";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { DASHBOARD_PAGE_BODY } from "@/lib/dashboard/layout";
import {
  checklistLines,
  matchesFilterTab,
  NOTES_FILTER_TABS,
  noteListIcon,
  tagChips,
  type NotesFilterTab,
} from "@/lib/notes/filters";
import { freeformDocument, titleFromFreeform } from "@/lib/notes/freeform";
import type { NoteKind, NoteRow } from "@/lib/notes/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type { NoteKind, NoteRow } from "@/lib/notes/types";

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

function kindLabel(tab: NotesFilterTab) {
  if (tab === "all") return "notes";
  if (tab === "goal") return "goals";
  if (tab === "clients") return "client notes";
  return "notes";
}

const PINNED_KEY = "ari-notes-pinned";

export function NotesStrategyPage() {
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<NotesFilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [contactDetail, setContactDetail] = useState<ContactDetail | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [kind, setKind] = useState<NoteKind>("note");
  const [contactId, setContactId] = useState("");
  const [contacts, setContacts] = useState<
    { id: string; first_name: string; last_name?: string | null }[]
  >([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("sm");
  const [fontFamily, setFontFamily] = useState<"serif" | "sans" | "hand">("serif");
  const [inkColor, setInkColor] = useState<"ink" | "slate" | "rose" | "sage">("ink");

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PINNED_KEY);
      if (raw) setPinnedIds(JSON.parse(raw) as string[]);
    } catch {
      /* ignore */
    }
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = notes.filter((n) => matchesFilterTab(n, filterTab));
    if (q) {
      list = list.filter((n) => `${n.title} ${n.body}`.toLowerCase().includes(q));
    }
    const pinSet = new Set(pinnedIds);
    return [...list].sort((a, b) => {
      const ap = pinSet.has(a.id) ? 1 : 0;
      const bp = pinSet.has(b.id) ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return (
        new Date(b.updated_at || b.created_at).getTime() -
        new Date(a.updated_at || a.created_at).getTime()
      );
    });
  }, [notes, filterTab, searchQuery, pinnedIds]);

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

  const startNew = useCallback((forTab?: NotesFilterTab) => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const nextKind: NoteKind =
      forTab === "strategy" ? "strategy" : forTab === "goal" ? "goal" : "note";
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
    try {
      const raw = localStorage.getItem("ari-notes-editor-prefs");
      if (!raw) return;
      const prefs = JSON.parse(raw) as {
        fontSize?: "sm" | "md" | "lg";
        fontFamily?: "serif" | "sans" | "hand";
        inkColor?: "ink" | "slate" | "rose" | "sage";
      };
      if (prefs.fontSize) setFontSize(prefs.fontSize);
      if (prefs.fontFamily) setFontFamily(prefs.fontFamily);
      if (prefs.inkColor) setInkColor(prefs.inkColor);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "ari-notes-editor-prefs",
      JSON.stringify({ fontSize, fontFamily, inkColor }),
    );
  }, [fontSize, fontFamily, inkColor]);

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
    else startNew(filterTab);
  }, [filterTab, filtered, openNote, startNew]);

  useEffect(() => {
    if (!contactId) {
      setContactDetail(null);
      return;
    }
    setContactLoading(true);
    void fetch(`/api/contacts/${contactId}`)
      .then((r) => r.json())
      .then((data) => {
        setContactDetail(data.contact ?? data ?? null);
      })
      .catch(() => setContactDetail(null))
      .finally(() => setContactLoading(false));
  }, [contactId]);

  const relatedNotes = useMemo(() => {
    if (!selectedId || !contactId) return [];
    return notes
      .filter((n) => n.contact_id === contactId && n.id !== selectedId)
      .slice(0, 3);
  }, [notes, selectedId, contactId]);

  const goalLines = useMemo(() => {
    const fromDraft = checklistLines(draftText);
    const fromGoals = notes.filter((n) => n.kind === "goal").map((n) => n.title);
    return [...fromDraft, ...fromGoals].slice(0, 6);
  }, [draftText, notes]);

  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(PINNED_KEY, JSON.stringify(next));
      return next;
    });
  };

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

  const appendGoalToDraft = (line: string) => {
    const insert = draftText.trim() ? `\n- [ ] ${line}` : `- [ ] ${line}`;
    const next = draftText + insert;
    setDraftText(next);
    draftTextRef.current = next;
    scheduleSave();
  };

  const remove = async (id: string) => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedIdRef.current === id) startNew(filterTab);
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

  const selectClass =
    "appearance-none rounded-lg border border-outline-variant/20 bg-ivory bg-[length:12px] bg-[right_0.65rem_center] bg-no-repeat py-1.5 pl-2.5 pr-8 text-[12px] text-ink";
  const selectChevron =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238C857B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")";

  const editorFontClass =
    fontFamily === "sans"
      ? "font-sans"
      : fontFamily === "hand"
        ? "font-[family-name:var(--font-hand)]"
        : "font-serif";
  const editorSizeClass =
    fontSize === "lg"
      ? "text-[18px] sm:text-[20px]"
      : fontSize === "md"
        ? "text-[15px] sm:text-[16px]"
        : "text-[13px] sm:text-[14px]";
  const editorColorClass =
    inkColor === "slate"
      ? "text-slate-text"
      : inkColor === "rose"
        ? "text-rose-gold-deep"
        : inkColor === "sage"
          ? "text-emerald-muted"
          : "text-ink";

  const selectedNote = notes.find((n) => n.id === selectedId);
  const displayTags = selectedNote ? tagChips(selectedNote) : tagChips({ id: "", kind, title: liveTitle, body: draftText });

  return (
    <div
      className={cn(
        DASHBOARD_PAGE_BODY,
        "mx-auto flex min-h-[calc(100vh-8rem)] max-w-[1400px] flex-col gap-4",
      )}
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-[22px] font-semibold text-ink">
            Notes &amp; Strategy
          </h2>
          <p className="mt-1 max-w-[var(--container-2xl)] text-[14px] text-slate-text">
            Capture ideas, plan strategy, and keep client context — all in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={() => startNew(filterTab)}
          className="inline-flex items-center gap-2 rounded-full bg-rose-gold px-5 py-2.5 text-[14px] font-medium text-ivory"
        >
          <Icon name="add" className="text-[18px]" />
          New note
        </button>
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {NOTES_FILTER_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilterTab(item.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium sm:px-4 sm:text-[13px]",
                filterTab === item.id
                  ? "bg-rose-gold text-ivory"
                  : "bg-champagne/60 text-taupe hover:text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-taupe" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes…"
              className="w-full rounded-full border border-outline-variant/20 bg-ivory py-2 pl-10 pr-4 text-[13px] outline-none focus:border-rose-gold/40"
            />
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-outline-variant/20 px-3 py-2 text-[12px] text-taupe"
          >
            Filter
            <Icon name="expand_more" className="text-[16px]" />
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-outline-variant/20 px-3 py-2 text-[12px] text-taupe"
          >
            Sort: Recent
            <Icon name="expand_more" className="text-[16px]" />
          </button>
          <div className="ml-auto flex rounded-full border border-outline-variant/20 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn("rounded-full p-1.5", viewMode === "list" ? "bg-champagne" : "text-taupe")}
              aria-label="List view"
            >
              <Icon name="view_list" className="text-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn("rounded-full p-1.5", viewMode === "grid" ? "bg-champagne" : "text-taupe")}
              aria-label="Grid view"
            >
              <Icon name="grid_view" className="text-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-[14px] text-error">
          {error.includes("contact_notes") ||
          error.includes("schema") ||
          error.toLowerCase().includes("does not exist")
            ? "Notes storage isn’t set up yet. Run the Notes SQL setup once, then refresh."
            : error}
        </p>
      ) : null}

      <div className="grid min-h-[520px] flex-1 gap-4 overflow-hidden lg:grid-cols-12">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-outline-variant/15 bg-ivory lg:col-span-3">
          <div className="flex items-center justify-between border-b border-outline-variant/10 px-4 py-3">
            <h2 className="font-medium text-ink">
              Notes{" "}
              <span className="text-[13px] font-normal text-taupe">({filtered.length})</span>
            </h2>
            <button type="button" onClick={() => startNew(filterTab)} aria-label="New note">
              <Icon name="add" className="text-[20px] text-rose-gold-deep" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {loading ? (
              <p className="p-4 text-[13px] text-taupe">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-[13px] text-taupe">
                No {kindLabel(filterTab)} here yet. Tap New note to create one.
              </p>
            ) : (
              <ul className={cn(viewMode === "grid" && "grid gap-2 sm:grid-cols-2 lg:grid-cols-1")}>
                {filtered.map((note) => {
                  const active = note.id === selectedId;
                  const tags = tagChips(note);
                  return (
                    <li key={note.id}>
                      <button
                        type="button"
                        onClick={() => openNote(note)}
                        className={cn(
                          "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                          active
                            ? "border-rose-gold/40 bg-rose-gold/5"
                            : "border-transparent hover:border-outline-variant/15 hover:bg-cream/60",
                        )}
                      >
                        <div className="flex gap-2">
                          <Icon name={noteListIcon(note)} className="shrink-0 text-[20px] text-rose-gold-deep" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-ink">{note.title || "Untitled"}</p>
                            <p className="mt-0.5 line-clamp-2 text-[12px] text-slate-text">{previewLine(note)}</p>
                            <p className="mt-1 text-[11px] text-taupe">
                              {formatWhen(note.updated_at || note.created_at)}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {tags.map((t) => (
                                <span
                                  key={t.label}
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                                    t.className,
                                  )}
                                >
                                  {t.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-outline-variant/15 bg-ivory lg:col-span-5">
          <div className="border-b border-outline-variant/10 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] text-taupe">
                Notes / <span className="text-ink">{liveTitle}</span>
              </p>
              <div className="flex items-center gap-2">
                <button type="button" className="rounded-full border border-outline-variant/20 px-3 py-1 text-[12px] text-ink">
                  Share
                </button>
                <button type="button" aria-label="More note options" className="rounded-full p-1 text-taupe hover:bg-champagne">
                  <Icon name="more_horiz" />
                </button>
              </div>
            </div>
            <h2 className="mt-2 font-serif text-[26px] font-semibold text-ink">{liveTitle}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {displayTags.map((t) => (
                <span
                  key={t.label}
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    t.className,
                  )}
                >
                  {t.label}
                </span>
              ))}
              <button type="button" className="rounded-full border border-dashed border-outline-variant/30 px-2.5 py-0.5 text-[10px] text-taupe">
                + Add tag
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-taupe">
              <span>
                {selectedNote
                  ? formatWhen(selectedNote.created_at)
                  : new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <select
                value={contactId}
                onChange={(e) => {
                  const next = e.target.value;
                  setContactId(next);
                  contactIdRef.current = next;
                  scheduleSave();
                }}
                className={cn(selectClass, "max-w-[180px]")}
                style={{ backgroundImage: selectChevron }}
              >
                <option value="">Assign contact…</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {`${c.first_name} ${c.last_name ?? ""}`.trim()}
                  </option>
                ))}
              </select>
              {selectedId ? (
                <button
                  type="button"
                  onClick={() => togglePin(selectedId)}
                  className="inline-flex items-center gap-1 text-rose-gold-deep"
                >
                  <Icon name="push_pin" className="text-[16px]" />
                  {pinnedIds.includes(selectedId) ? "Pinned" : "Pin to top"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1 border-b border-outline-variant/10 px-3 py-2">
            {["format_bold", "format_italic", "format_list_bulleted", "check_box", "link", "image", "table"].map(
              (icon) => (
                <button
                  key={icon}
                  type="button"
                  className="rounded-lg p-2 text-taupe hover:bg-champagne"
                  aria-label={icon}
                >
                  <Icon name={icon} className="text-[18px]" />
                </button>
              ),
            )}
            <button
              type="button"
              onClick={insertChecklist}
              className="ml-1 rounded-full border border-outline-variant/20 px-3 py-1 text-[11px] text-ink"
            >
              Checklist
            </button>
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-[11px] font-medium text-violet-900"
            >
              <Icon name="auto_awesome" className="text-[14px]" />
              AI Assist
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant/10 px-3 py-2 text-[11px] text-taupe">
            <select
              value={kind}
              onChange={(e) => {
                const next = e.target.value as NoteKind;
                setKind(next);
                kindRef.current = next;
                scheduleSave();
              }}
              className={selectClass}
              style={{ backgroundImage: selectChevron }}
            >
              <option value="note">Note</option>
              <option value="strategy">Strategy</option>
              <option value="goal">Goal</option>
            </select>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value as "sm" | "md" | "lg")}
              className={selectClass}
              style={{ backgroundImage: selectChevron }}
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
            <span className="ml-auto">
              {saveState === "saving"
                ? "Saving…"
                : saveState === "saved"
                  ? "Saved"
                  : saveState === "error"
                    ? (saveError ?? "Save failed")
                    : ""}
            </span>
            {selectedId ? (
              <button
                type="button"
                onClick={() => void remove(selectedId)}
                className="rounded-lg p-1 text-taupe hover:text-error"
                aria-label="Delete"
              >
                <Icon name="delete" className="text-[18px]" />
              </button>
            ) : null}
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
            className={cn(
              "min-h-[280px] flex-1 resize-none border-0 bg-transparent px-5 py-4 leading-relaxed outline-none placeholder:text-taupe/50 lg:min-h-0",
              editorFontClass,
              editorSizeClass,
              editorColorClass,
            )}
            spellCheck
          />
        </section>

        <div className="hidden min-h-0 lg:col-span-4 lg:block">
          <NotesStrategySidebar
            contact={contactDetail}
            contactLoading={contactLoading}
            goalLines={goalLines}
            related={relatedNotes}
            onOpenNote={openNote}
            onAddGoalLine={appendGoalToDraft}
          />
        </div>
      </div>
    </div>
  );
}
