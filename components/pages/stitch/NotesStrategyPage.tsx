"use client";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/crm/modal";
import {
  CATEGORIES,
  TEMPLATES,
  filterNotes,
  MetadataSchema,
  relatedContactIds,
  type NoteMetadata,
  type WorkspaceNote,
} from "@/lib/notes/workspace";
import {
  notesRequest,
  useNotesWorkspace,
} from "@/components/notes/use-notes-workspace";
import { DictationPanel } from "@/components/notes/dictation-panel";
import { AiReview, type SuggestedTask } from "@/components/notes/ai-review";
import {
  RealtorPlanner,
  type PlannerTask,
} from "@/components/notes/realtor-planner";
import "@/components/notes/notes-workspace.css";

function name(c: { first_name: string; last_name?: string | null }) {
  return `${c.first_name} ${c.last_name ?? ""}`.trim();
}
function when(iso?: string) {
  return iso
    ? new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "New note";
}
export function NotesStrategyPage() {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return <p role="status">Loading your workspace…</p>;
  if (!user) return <p>Sign in to open your notes.</p>;
  return <NotesWorkspace key={user.id} owner={user.id} />;
}
function NotesWorkspace({ owner }: { owner: string }) {
  const [taskReviewOpen, setTaskReviewOpen] = useState(false);
  const w = useNotesWorkspace(owner),
    { draft, setDraft } = w,
    params = useSearchParams(),
    deep = useRef(false),
    editor = useRef<HTMLTextAreaElement>(null);
  const [category, setCategory] = useState("All Notes"),
    [query, setQuery] = useState(""),
    [tag, setTag] = useState(""),
    [contactFilter, setContactFilter] = useState(""),
    [sort, setSort] = useState("recent"),
    [contactQuery, setContactQuery] = useState(""),
    [propertyQuery, setPropertyQuery] = useState(""),
    [preview, setPreview] = useState(false),
    [panel, setPanel] = useState<
      "" | "templates" | "dictation" | "ai" | "versions" | "task" | "delete"
    >(""),
    [aiSource, setAiSource] = useState(""),
    [versions, setVersions] = useState<WorkspaceNote[]>([]),
    [taskRows, setTaskRows] = useState<PlannerTask[]>([]),
    [taskError, setTaskError] = useState(""),
    [taskDraft, setTaskDraft] = useState({
      key: "",
      title: "",
      description: "",
      contactId: "",
      propertyContactId: "",
      due: "",
      priority: "normal",
      reminder: false,
    }),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [mobilePanel, setMobilePanel] = useState<"editor" | "notes" | "context">(
      "editor",
    ),
    [viewReady, setViewReady] = useState(false);
  const viewKey = `myari:notes:view:${owner}`;
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(viewKey);
      if (raw) {
        const v = JSON.parse(raw);
        setCategory(v.category ?? "All Notes");
        setQuery(v.query ?? "");
        setSort(v.sort ?? "recent");
        setTag(v.tag ?? "");
        setContactFilter(v.contactFilter ?? "");
      }
    } catch {}
    setViewReady(true);
  }, [viewKey]);
  useEffect(() => {
    if (viewReady)
      try {
        sessionStorage.setItem(
          viewKey,
          JSON.stringify({ category, query, sort, tag, contactFilter }),
        );
      } catch {}
  }, [category, query, sort, tag, contactFilter, viewKey, viewReady]);
  const reloadTasks = useCallback(async () => {
    try {
      const data = await notesRequest<{ tasks: PlannerTask[]; error?: string }>(
        "/api/notes/planner",
      );
      if (data.error) throw Error();
      setTaskRows(data.tasks);
      setTaskError("");
    } catch {
      setTaskRows([]);
      setTaskError("Related tasks are unavailable.");
    }
  }, []);
  useEffect(() => {
    void reloadTasks();
  }, [reloadTasks]);
  useEffect(() => {
    if (w.loading || deep.current || !w.notes.length) return;
    if (w.draft.title || w.draft.body || w.recovery) {
      deep.current = true;
      return;
    }
    deep.current = true;
    const id = params.get("note");
    const note =
      w.notes.find((n) => n.id === id) ??
      (params.get("new") === "note" || w.recovery
        ? undefined
        : (w.notes.find((n) => n.metadata.pinned) ?? w.notes[0]));
    if (note) void w.open(note);
  }, [w.loading, w.notes, params, w]);
  const filtered = useMemo(
    () =>
      filterNotes(
        w.notes,
        query,
        category,
        tag,
        contactFilter,
        sort,
        w.contacts,
      ),
    [w.notes, w.contacts, query, category, tag, contactFilter, sort],
  );
  const allTags = [...new Set(w.notes.flatMap((n) => n.metadata.tags))].sort(),
    linked = w.contacts.filter((c) => draft.metadata.contactIds.includes(c.id)),
    properties = w.contacts.filter((c) => c.property_address),
    linkedProperties = properties.filter((c) =>
      draft.metadata.propertyContactIds.includes(c.id),
    );
  const contactMatches = w.contacts
    .filter((c) =>
      `${name(c)} ${c.email ?? ""}`
        .toLowerCase()
        .includes(contactQuery.toLowerCase()),
    )
    .slice(0, 25);
  const propertyMatches = properties
    .filter((c) =>
      `${c.property_address} ${name(c)}`
        .toLowerCase()
        .includes(propertyQuery.toLowerCase()),
    )
    .slice(0, 25);
  const related = w.notes
    .filter(
      (n) =>
        n.id !== draft.id &&
        (relatedContactIds(n).some((id) =>
          draft.metadata.contactIds.includes(id),
        ) ||
          n.metadata.propertyContactIds.some((id) =>
            draft.metadata.propertyContactIds.includes(id),
          )),
    )
    .slice(0, 5);
  const advanced = w.mode === "advanced";
  function meta(update: Partial<NoteMetadata>) {
    if (!advanced && update.contactIds) {
      const primary = w.contacts.find((c) => c.id === update.contactIds?.[0]);
      update = {
        ...update,
        propertyContactIds: primary?.property_address ? [primary.id] : [],
      };
    }
    setDraft((d) => ({ ...d, metadata: { ...d.metadata, ...update } }));
  }
  async function open(n?: WorkspaceNote) {
    if (await w.open(n)) {
      setMobilePanel("editor");
      setNotice("");
      setPreview(false);
    }
  }
  function format(before: string, after = "") {
    const el = editor.current;
    if (!el) return;
    const a = el.selectionStart,
      b = el.selectionEnd;
    setDraft((d) => ({
      ...d,
      body:
        d.body.slice(0, a) +
        before +
        d.body.slice(a, b) +
        after +
        d.body.slice(b),
    }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + before.length, b + before.length);
    });
  }
  async function versionsOpen() {
    if (!draft.id) return;
    setBusy(true);
    try {
      const data = await notesRequest<{ versions: WorkspaceNote[] }>(
        `/api/notes/${draft.id}/versions`,
      );
      setVersions(data.versions);
      setPanel("versions");
    } catch (e) {
      w.setError(
        e instanceof Error ? e.message : "Version history unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function newFromTemplate(t: readonly [string, string, string]) {
    if (!(await w.open())) return;
    setDraft((d) => ({
      ...d,
      title: t[0],
      body: t[2],
      metadata: { ...d.metadata, category: t[1] as NoteMetadata["category"] },
    }));
    setPanel("");
    setMobilePanel("editor");
  }
  async function duplicate(template = false) {
    if (template && !advanced) return;
    if (!(await w.save())) return;
    const copy = { ...draft };
    if (!(await w.open())) return;
    setDraft((d) => ({
      ...d,
      title: copy.title + (template ? " template" : " copy"),
      body: copy.body,
      kind: copy.kind,
      metadata: {
        ...copy.metadata,
        pinned: false,
        isTemplate: template,
        category: template ? "Templates" : copy.metadata.category,
      },
    }));
    setNotice(
      template
        ? "Template copy created. Edit and reuse it from Templates."
        : "Editable copy created.",
    );
  }
  async function prepareTask(t?: SuggestedTask, summaryText?: string) {
    if (!advanced)
      throw Error(
        "Note-linked tasks are not available yet. You can create a task from the Tasks tab.",
      );
    if (summaryText) {
      if (
        !(await w.changeAndSave((d) => ({
          ...d,
          title: d.title || "Reviewed summary",
          body: d.body.includes(summaryText)
            ? d.body
            : d.body
              ? d.body + "\n\n" + summaryText
              : summaryText,
        })))
      )
        return;
    } else if (!(await w.save())) return;
    const current = w.getDraft();
    const text =
      t?.title ||
      editor.current?.value.slice(
        editor.current.selectionStart,
        editor.current.selectionEnd,
      ) ||
      "";
    setTaskDraft({
      key: t?.key ?? crypto.randomUUID(),
      title: text.slice(0, 200),
      description: t?.description ?? "",
      contactId: current.metadata.contactIds[0] ?? "",
      propertyContactId: current.metadata.propertyContactIds[0] ?? "",
      due: "",
      priority: "normal",
      reminder: false,
    });
    if (panel === "ai") setTaskReviewOpen(true);
    else setPanel("task");
  }
  async function createTask() {
    setBusy(true);
    try {
      if (!(await w.save())) return;
      const noteId = w.getDraft().id;
      if (!noteId) throw Error("Save the source note before creating a task.");
      const data = await notesRequest<{ task: PlannerTask; warning?: string }>(
        `/api/notes/${noteId}/tasks`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            actionKey: taskDraft.key,
            title: taskDraft.title,
            description: taskDraft.description,
            contactId: taskDraft.contactId || null,
            propertyContactId: taskDraft.propertyContactId || null,
            dueAt: taskDraft.due ? new Date(taskDraft.due).toISOString() : null,
            priority: taskDraft.priority,
            calendarReminder: taskDraft.reminder,
            approved: true,
          }),
        },
      );
      setNotice(data.warning ?? "Task created and linked to this note.");
      if (taskReviewOpen) setTaskReviewOpen(false);
      else setPanel("");
      await reloadTasks();
    } catch (e) {
      w.setError(e instanceof Error ? e.message : "Task could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!draft.id) return;
    setBusy(true);
    try {
      if (!(await w.save())) return;
      await notesRequest(`/api/notes/${draft.id}`, { method: "DELETE" });
      await w.open();
      await w.load();
      setPanel("");
      setNotice("Note and version history deleted. Linked tasks are retained.");
    } catch (e) {
      w.setError(e instanceof Error ? e.message : "Unable to delete note.");
    } finally {
      setBusy(false);
    }
  }
  const taskForm = (
    <>
      <p>
        Confirming creates one task linked to the source note. No message is
        sent.
      </p>
      <label>
        Task title
        <input
          aria-label="Task title"
          value={taskDraft.title}
          maxLength={200}
          onChange={(e) =>
            setTaskDraft((t) => ({ ...t, title: e.target.value }))
          }
        />
      </label>
      <label>
        Description
        <textarea
          aria-label="Task description"
          value={taskDraft.description}
          maxLength={2000}
          onChange={(e) =>
            setTaskDraft((t) => ({ ...t, description: e.target.value }))
          }
        />
      </label>
      <label>
        Contact
        <select
          aria-label="Task contact"
          value={taskDraft.contactId}
          onChange={(e) =>
            setTaskDraft((t) => ({ ...t, contactId: e.target.value }))
          }
        >
          <option value="">Personal task</option>
          {w.contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {name(c)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Related property
        <select
          value={taskDraft.propertyContactId}
          onChange={(e) =>
            setTaskDraft((t) => ({
              ...t,
              propertyContactId: e.target.value,
            }))
          }
        >
          <option value="">No property</option>
          {properties.map((c) => (
            <option value={c.id} key={c.id}>
              {c.property_address}
            </option>
          ))}
        </select>
      </label>
      <label>
        Due date &amp; time (your device time zone)
        <input
          aria-label="Task due date"
          type="datetime-local"
          value={taskDraft.due}
          onChange={(e) => setTaskDraft((t) => ({ ...t, due: e.target.value }))}
        />
      </label>
      <label>
        Priority
        <select
          value={taskDraft.priority}
          onChange={(e) =>
            setTaskDraft((t) => ({ ...t, priority: e.target.value }))
          }
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
      </label>
      <p>Status: Open. Update completion in Tasks.</p>
      <label className="notes-consent">
        <input
          type="checkbox"
          disabled={!taskDraft.due}
          checked={taskDraft.reminder}
          onChange={(e) =>
            setTaskDraft((t) => ({ ...t, reminder: e.target.checked }))
          }
        />
        Add calendar reminder using existing calendar integration
      </label>
      <button
        className="notes-primary"
        disabled={busy || !taskDraft.title.trim()}
        onClick={() => void createTask()}
      >
        {busy ? "Saving task…" : "Confirm & create task"}
      </button>
    </>
  );
  return (
    <div className="notes-premium">
      <section className="notes-hero">
        <Image
          src="/brand/heroes/notes-botanical-office.png"
          alt="Warm botanical home office with travertine desk and courtyard garden windows"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 85vw"
        />
        <div className="notes-hero-copy">
          <p>NOTES &amp; STRATEGY</p>
          <h1>Great outcomes begin with a plan.</h1>
          <span>
            Capture insights, organize ideas, and turn strategy into action.
          </span>
        </div>
        <aside>
          <Icon name="lightbulb" />
          <div>
            <strong>Turn ideas into action.</strong>
            <p>Connect your thinking to your next step.</p>
          </div>
        </aside>
      </section>
      <nav className="notes-category-bar" aria-label="Note categories">
        <div className="notes-category-tabs">
          {[
            "All Notes",
            "Clients",
            "Properties",
            "Strategy",
            "Goals",
            "Ideas",
            "Tasks",
            "Meeting Notes",
            "Templates",
            "Pinned",
          ].map((c, i) => (
            <button
              key={c}
              disabled={
                !advanced &&
                !["All Notes", "Clients", "Strategy", "Goals"].includes(c)
              }
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              <Icon
                name={
                  [
                    "description",
                    "person",
                    "home",
                    "lightbulb",
                    "flag",
                    "edit_note",
                    "checklist",
                    "groups",
                    "auto_stories",
                    "push_pin",
                  ][i]
                }
              />
              {c}
            </button>
          ))}
        </div>
        <div className="notes-category-actions">
          <button className="notes-primary" onClick={() => void open()}>
            <Icon name="add" />
            New Note
          </button>
          <button
            aria-label="AI Assist"
            onClick={() => {
              setAiSource(draft.body);
              setPanel("ai");
            }}
          >
            <Icon name="auto_awesome" />
            AI Assist
          </button>
          <button disabled={!advanced} onClick={() => setPanel("templates")}>
            Use Template
          </button>
        </div>
      </nav>
      <div className="notes-mobile-switch" aria-label="Workspace panels">
        {(["notes", "editor", "context"] as const).map((p) => (
          <button
            key={p}
            aria-pressed={mobilePanel === p}
            onClick={() => setMobilePanel(p)}
          >
            {p === "notes"
              ? "Notes library"
              : p === "editor"
                ? "Editor"
                : "Planner & context"}
          </button>
        ))}
      </div>
      {w.mode === "basic" && !w.loadError && (
        <p className="notes-notice" role="status">
          Your notes are available. Basic editing and a linked contact are
          supported; history, tags, multiple associations and note-linked tasks
          are not available yet.
        </p>
      )}
      {w.error && (
        <div role="alert" className="notes-alert">
          {w.error}
          <div className="notes-actions">
            <button onClick={() => void w.load()}>Reload library</button>
            <button onClick={() => void w.save()}>Retry save</button>
            {draft.id && (
              <button
                onClick={() => {
                  if (
                    confirm(
                      "Replace your editor with the latest server version? Copy any local edits first.",
                    )
                  )
                    void w.useServer();
                }}
              >
                Load server version
              </button>
            )}
            <button onClick={() => void w.saveRecoveryAsNew()}>
              Save draft as a new note
            </button>
          </div>
        </div>
      )}
      {w.recovery && (
        <div className="notes-alert">
          <p>
            An unsaved draft from this account is available. It will not
            overwrite the server automatically.
          </p>
          <button onClick={w.restore}>Recover draft for review</button>
          <button onClick={w.discardRecovery}>Discard recovery draft</button>
        </div>
      )}
      {w.status.startsWith("Recovered") && (
        <div className="notes-alert">
          Review the recovered content, then{" "}
          <button onClick={() => void w.saveRecoveryAsNew()}>
            save as a new note
          </button>{" "}
          to preserve both versions.
        </div>
      )}
      {notice && (
        <p className="notes-notice" role="status">
          {notice}
        </p>
      )}
      <div className="notes-columns" data-panel={mobilePanel}>
        <aside className="notes-library notes-surface">
          <label className="notes-search">
            <Icon name="search" />
            <input
              aria-label="Search notes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes, clients, properties…"
            />
          </label>
          <details className="notes-library-controls">
            <summary>Sort &amp; filter library</summary>
            <div className="notes-library-filters">
              <select
                aria-label="Sort notes"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="recent">Recent edits</option>
                <option value="oldest">Oldest edited</option>
                <option value="title">Title A–Z</option>
              </select>
              <select
                aria-label="Filter by tag"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
              >
                <option value="">All tags</option>
                {allTags.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <select
                aria-label="Filter by contact"
                value={contactFilter}
                onChange={(e) => setContactFilter(e.target.value)}
              >
                <option value="">All contacts</option>
                {w.contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {name(c)}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setQuery("");
                  setTag("");
                  setContactFilter("");
                  setCategory("All Notes");
                  setSort("recent");
                }}
              >
                Clear filters
              </button>
            </div>
          </details>
          <p className="notes-count">
            {w.loading
              ? "Loading notes…"
              : w.loadError
                ? "Notes unavailable"
                : `${filtered.length} ${filtered.length === 1 ? "note" : "notes"}`}
          </p>
          {filtered.map((n) => (
            <button
              className="notes-note-preview"
              aria-pressed={draft.id === n.id}
              key={n.id}
              onClick={() => void open(n)}
            >
              <Icon
                name={
                  n.metadata.pinned
                    ? "push_pin"
                    : n.kind === "goal"
                      ? "flag"
                      : "description"
                }
              />
              <div>
                <strong>{n.title || "Untitled note"}</strong>
                <span>
                  {relatedContactIds(n)
                    .map((id) => w.contacts.find((c) => c.id === id))
                    .filter(Boolean)
                    .map((c) => name(c!))
                    .join(", ") || n.metadata.category}
                </span>
                <p>
                  {n.body.replace(/[#*_[\]]/g, "").slice(0, 140) ||
                    "No content yet."}
                </p>
                <footer>
                  <em>{n.metadata.category}</em>
                  <small>{when(n.updated_at ?? n.created_at)}</small>
                </footer>
              </div>
            </button>
          ))}
          {!w.loading && !w.loadError && !filtered.length && (
            <div className="notes-empty">
              <Icon name="edit_note" />
              <h3>Room for your next idea.</h3>
              <p>Create a note or adjust your filters.</p>
              <button
                onClick={() => {
                  setQuery("");
                  setTag("");
                  setContactFilter("");
                  setCategory("All Notes");
                }}
              >
                Clear filters
              </button>
              <button onClick={() => void open()}>Create a note</button>
            </div>
          )}
        </aside>
        <section className="notes-editor notes-surface">
          <header>
            <div className="notes-panel-heading">
              <span>Notes / {draft.metadata.category}</span>
              <div className="notes-actions">
                <button
                  disabled={!advanced}
                  aria-label={draft.metadata.pinned ? "Unpin note" : "Pin note"}
                  aria-pressed={draft.metadata.pinned}
                  onClick={() => meta({ pinned: !draft.metadata.pinned })}
                >
                  <Icon name="star" />
                </button>
                <button
                  disabled={busy || !draft.id || !advanced}
                  onClick={() => void versionsOpen()}
                >
                  History
                </button>
                <button
                  disabled={!draft.body && !draft.title}
                  onClick={() => void duplicate()}
                >
                  Duplicate
                </button>
              </div>
            </div>
            <input
              className="notes-title"
              aria-label="Note title"
              placeholder="Give your idea a title…"
              value={draft.title}
              maxLength={200}
              onChange={(e) =>
                setDraft((d) => ({ ...d, title: e.target.value }))
              }
            />
            <div className="notes-associations">
              <details>
                <summary>
                  <Icon name="person" />
                  {linked.length
                    ? `${linked.length} linked contact${linked.length > 1 ? "s" : ""}`
                    : "Link contacts"}
                </summary>
                <input
                  aria-label="Search contacts to link"
                  placeholder="Name or email…"
                  value={contactQuery}
                  onChange={(e) => setContactQuery(e.target.value)}
                />
                <div className="notes-options">
                  {contactMatches.map((c) => (
                    <label key={c.id}>
                      <input
                        type="checkbox"
                        checked={draft.metadata.contactIds.includes(c.id)}
                        onChange={(e) =>
                          meta({
                            contactIds: e.target.checked
                              ? advanced
                                ? [...draft.metadata.contactIds, c.id]
                                : [c.id]
                              : draft.metadata.contactIds.filter(
                                  (id) => id !== c.id,
                                ),
                          })
                        }
                      />
                      {name(c)}
                      <small>{c.email}</small>
                    </label>
                  ))}
                  {!contactMatches.length && <p>No matching contacts.</p>}
                </div>
              </details>
              <details>
                <summary>
                  <Icon name="home" />
                  {linkedProperties.length
                    ? `${linkedProperties.length} linked ${linkedProperties.length === 1 ? "property" : "properties"}`
                    : "Link property"}
                </summary>
                {!advanced && (
                  <p>
                    Link one contact and its saved property together.
                    Independent property links need the workspace upgrade.
                  </p>
                )}
                <input
                  aria-label="Search saved property addresses"
                  placeholder="Saved address or client…"
                  value={propertyQuery}
                  onChange={(e) => setPropertyQuery(e.target.value)}
                />
                <div className="notes-options">
                  {propertyMatches.map((c) => (
                    <label key={c.id}>
                      <input
                        type="checkbox"
                        checked={draft.metadata.propertyContactIds.includes(
                          c.id,
                        )}
                        onChange={(e) => {
                          if (!advanced) {
                            const current = draft.metadata.contactIds[0];
                            if (
                              current &&
                              (current !== c.id || !e.target.checked) &&
                              !confirm(
                                "Basic notes link one contact and its saved property together. Replace or remove the current contact link?",
                              )
                            )
                              return;
                            meta({
                              contactIds: e.target.checked ? [c.id] : [],
                            });
                            return;
                          }
                          meta({
                            propertyContactIds: e.target.checked
                              ? [...draft.metadata.propertyContactIds, c.id]
                              : draft.metadata.propertyContactIds.filter(
                                  (id) => id !== c.id,
                                ),
                          });
                        }}
                      />
                      {c.property_address}
                      <small>{name(c)}</small>
                    </label>
                  ))}
                  {!propertyMatches.length && (
                    <p>
                      No saved property addresses. Add an address on a contact
                      first.
                    </p>
                  )}
                </div>
              </details>
            </div>
            <div className="notes-meta">
              <select
                aria-label="Note category"
                value={draft.metadata.category}
                onChange={(e) => {
                  const c = e.target.value as NoteMetadata["category"];
                  setDraft((d) => ({
                    ...d,
                    kind:
                      c === "Goals"
                        ? "goal"
                        : c === "Strategy"
                          ? "strategy"
                          : "note",
                    metadata: { ...d.metadata, category: c },
                  }));
                }}
              >
                {CATEGORIES.filter(
                  (c) =>
                    advanced || ["General", "Strategy", "Goals"].includes(c),
                ).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input
                disabled={!advanced}
                aria-label="Note tags"
                placeholder="Tags, separated by commas"
                key={draft.clientKey + draft.revision}
                defaultValue={draft.metadata.tags.join(", ")}
                onBlur={(e) =>
                  meta({
                    tags: [
                      ...new Set(
                        e.target.value
                          .split(",")
                          .map((t) => t.trim().slice(0, 40))
                          .filter(Boolean),
                      ),
                    ].slice(0, 16),
                  })
                }
              />
              <span>
                {draft.id
                  ? when(w.notes.find((n) => n.id === draft.id)?.created_at)
                  : "New note"}
              </span>
            </div>
          </header>
          <div className="notes-format-toolbar">
            <button aria-label="Bold" onClick={() => format("**", "**")}>
              <b>B</b>
            </button>
            <button aria-label="Italic" onClick={() => format("*", "*")}>
              <i>I</i>
            </button>
            <button aria-label="Heading" onClick={() => format("\n## ")}>
              H2
            </button>
            <button aria-label="Bullet list" onClick={() => format("\n- ")}>
              <Icon name="format_list_bulleted" />
            </button>
            <button aria-label="Checklist" onClick={() => format("\n- [ ] ")}>
              <Icon name="checklist" />
            </button>
            <button
              aria-label="Insert link"
              onClick={() => format("[", "](https://)")}
            >
              <Icon name="link" />
            </button>
            <button
              aria-label="Mention contact"
              onClick={() => {
                setContactQuery("");
                format("@");
              }}
            >
              @
            </button>
            <button
              disabled={!advanced}
              aria-label="Dictate"
              className="notes-dictate"
              onClick={() => setPanel("dictation")}
            >
              <Icon name="mic" />
              Dictate
            </button>
            <button
              aria-label="AI Assist"
              onClick={() => {
                setAiSource(draft.body);
                setPanel("ai");
              }}
            >
              <Icon name="auto_awesome" />
              AI Assist
            </button>
          </div>
          <div className="notes-editor-mode">
            <span role="status" aria-live="polite">
              {w.status}
            </span>
            <button aria-pressed={preview} onClick={() => setPreview(!preview)}>
              {preview ? "Edit text" : "Formatted preview"}
            </button>
          </div>
          {preview ? (
            <NotePreview
              body={draft.body}
              onToggle={(line) => {
                setDraft((d) => ({
                  ...d,
                  body: d.body
                    .split("\n")
                    .map((l, i) =>
                      i === line
                        ? l.replace(/\[([ xX])\]/, (_m, v) =>
                            v === " " ? "[x]" : "[ ]",
                          )
                        : l,
                    )
                    .join("\n"),
                }));
              }}
            />
          ) : (
            <textarea
              ref={editor}
              className="notes-canvas"
              aria-label="Note content"
              placeholder="Start writing. Use @ to link a contact, or choose a template…"
              value={draft.body}
              maxLength={30000}
              onChange={(e) => {
                setDraft((d) => ({ ...d, body: e.target.value }));
                const match = e.target.value
                  .slice(0, e.target.selectionStart)
                  .match(/@([^@\n]{0,50})$/);
                if (match) setContactQuery(match[1]);
              }}
            />
          )}
          {!preview && draft.body.includes("@") && (
            <details className="notes-mention" open>
              <summary>
                @ Contact mentions — select a real record to link
              </summary>
              {contactMatches.slice(0, 5).map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    meta({
                      contactIds: [
                        ...new Set(
                          advanced
                            ? [...draft.metadata.contactIds, c.id]
                            : [c.id],
                        ),
                      ],
                    });
                    setNotice(`${name(c)} linked by record ID.`);
                  }}
                >
                  {name(c)} {c.email}
                </button>
              ))}
            </details>
          )}
          <footer className="notes-editor-footer">
            <span>
              {draft.body.length.toLocaleString()} / 30,000 characters
            </span>
            <button
              disabled={busy || !draft.body.trim() || !advanced}
              onClick={() => void prepareTask()}
            >
              Selection → task
            </button>
            <button disabled={busy} onClick={() => void w.save()}>
              Save now
            </button>
            <button
              disabled={!draft.id}
              onClick={() => setPanel("delete")}
              className="notes-danger"
            >
              Delete
            </button>
          </footer>
          {draft.metadata.originalTranscript && (
            <details className="notes-original">
              <summary>Original transcript (preserved separately)</summary>
              <pre>{draft.metadata.originalTranscript}</pre>
            </details>
          )}
        </section>
        <aside className="notes-context">
          <section className="notes-surface">
            <div className="notes-panel-heading">
              <h3>Related Tasks</h3>
              <button
                disabled={(!draft.body && !draft.title) || !advanced}
                onClick={() => void prepareTask()}
              >
                + Add Task
              </button>
            </div>
            {taskError && <p role="alert">{taskError}</p>}
            {taskRows
              .filter((t) => t.source_note_id === draft.id)
              .map((t) => (
                <Link
                  className="notes-related-task"
                  key={t.id}
                  href={`/dashboard/contacts/${t.contact_id}`}
                >
                  <Icon
                    name={t.completed ? "check_box" : "check_box_outline_blank"}
                  />
                  <span>
                    {t.title}
                    <small>
                      {t.due_at ? when(t.due_at) : "No due date"} ·{" "}
                      {t.completed ? "Completed" : "Open"}
                    </small>
                  </span>
                </Link>
              ))}
            {!advanced && (
              <p>
                Open <Link href="/dashboard/tasks">Tasks</Link> to manage tasks.
                Note-linked tasks are not available yet.
              </p>
            )}
            {advanced &&
              !taskError &&
              !taskRows.some((t) => t.source_note_id === draft.id) && (
                <p>
                  No tasks linked to this note. Select text or review an AI
                  suggestion to create one.
                </p>
              )}
          </section>
          <section className="notes-surface">
            <RealtorPlanner
              readOnly={!advanced}
              refreshKey={taskRows.length}
              priorities={draft.metadata.priorityIds}
              onPriorities={(ids) => meta({ priorityIds: ids })}
              onTemplate={() => setPanel("templates")}
            />
          </section>
          <section className="notes-surface">
            <h3>Related contacts &amp; properties</h3>
            {linked.map((c) => (
              <Link
                className="notes-context-link"
                key={c.id}
                href={`/dashboard/contacts/${c.id}`}
              >
                {name(c)}
                <small>{c.email || c.phone || "Open contact profile"} →</small>
              </Link>
            ))}
            {linkedProperties.map((c) => (
              <Link
                className="notes-context-link"
                key={c.id}
                href={`/dashboard/properties?contactId=${c.id}`}
              >
                {c.property_address}
                <small>Saved contact property address · {name(c)} →</small>
              </Link>
            ))}
            {!linked.length && !linkedProperties.length && (
              <p>
                Link existing records in the editor to bring context into view.
              </p>
            )}
            <Link className="notes-context-link" href="/dashboard/campaigns">
              Explore campaign library →
            </Link>
            <p>
              Review campaign choices in the existing workflow; no enrollment is
              automatic.
            </p>
          </section>
          <section className="notes-surface">
            <h3>Related Notes</h3>
            {related.map((n) => (
              <button
                className="notes-context-link"
                key={n.id}
                onClick={() => void open(n)}
              >
                {n.title}
                <small>
                  {n.metadata.category} · {when(n.updated_at)}
                </small>
              </button>
            ))}
            {!related.length && (
              <p>No other notes share these linked records yet.</p>
            )}
          </section>
        </aside>
      </div>
      <Modal
        open={panel !== ""}
        onClose={() => {
          if (!busy) setPanel("");
        }}
        title={
          panel === "templates"
            ? "MyARI planner templates"
            : panel === "dictation"
              ? "Dictation & call recap"
              : panel === "ai"
                ? "AI Assist — review before saving"
                : panel === "versions"
                  ? "Version history"
                  : panel === "delete"
                    ? "Delete note?"
                    : "Review & create task"
        }
        size={panel === "ai" ? "xl" : "lg"}
      >
        <div className="notes-modal">
          {panel === "templates" && (
            <>
              <p>
                Original, editable MyARI templates. Prompts are blank
                intentionally: add verified details.
              </p>
              {TEMPLATES.map((t) => (
                <button
                  className="notes-template"
                  key={t[0]}
                  onClick={() => void newFromTemplate(t)}
                >
                  <Icon name="auto_stories" />
                  <strong>{t[0]}</strong>
                  <span>Use template →</span>
                </button>
              ))}
              <button
                disabled={!draft.body}
                onClick={() => {
                  void duplicate(true);
                  setPanel("");
                }}
              >
                Save current note as reusable template
              </button>
              {w.notes
                .filter((n) => n.metadata.isTemplate)
                .map((n) => (
                  <button
                    key={n.id}
                    className="notes-template"
                    onClick={async () => {
                      if (!(await w.open())) return;
                      setDraft((d) => ({
                        ...d,
                        title: n.title.replace(/ template$/, ""),
                        body: n.body,
                        metadata: {
                          ...MetadataSchema.parse({}),
                          category: "General",
                        },
                      }));
                      setPanel("");
                    }}
                  >
                    {n.title} → Use saved template
                  </button>
                ))}
            </>
          )}
          {panel === "dictation" && (
            <DictationPanel
              onSave={(text, original, source) => {
                setDraft((d) => ({
                  ...d,
                  title: d.title || "Transcript",
                  body: d.body ? d.body + "\n\n" + text : text,
                  metadata: {
                    ...d.metadata,
                    originalTranscript: original,
                    transcriptSource: source,
                  },
                }));
                setPanel("");
                setNotice(
                  "Transcript added to the note. Original text is preserved separately.",
                );
              }}
              onSummarize={(text) => {
                setDraft((d) => ({
                  ...d,
                  metadata: {
                    ...d.metadata,
                    originalTranscript: d.metadata.originalTranscript || text,
                    transcriptSource: d.metadata.transcriptSource || "typed",
                  },
                }));
                setAiSource(text);
                setPanel("ai");
              }}
            />
          )}
          {panel === "ai" && (
            <AiReview
              source={aiSource}
              noteId={draft.id ?? undefined}
              onSave={(text) => {
                setDraft((d) => ({
                  ...d,
                  title: d.title || "Reviewed summary",
                  body: d.body ? d.body + "\n\n" + text : text,
                }));
                setPanel("");
                setNotice("Summary added. No tasks or messages were created.");
              }}
              onTask={prepareTask}
            />
          )}
          {panel === "versions" && (
            <>
              <p>
                Up to 50 previous versions. Restoring creates a new revision and
                preserves history.
              </p>
              {!versions.length && <p>No previous versions yet.</p>}
              {versions.map((v) => (
                <details key={v.id}>
                  <summary>
                    Version {v.revision} · {when(v.created_at)} · {v.title}
                  </summary>
                  <pre>{v.body}</pre>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "Restore this previous version into the editor?",
                        )
                      ) {
                        setDraft((d) => ({
                          ...d,
                          title: v.title,
                          body: v.body,
                          kind: v.kind,
                          metadata: MetadataSchema.parse(v.metadata),
                        }));
                        setPanel("");
                      }
                    }}
                  >
                    Restore this version
                  </button>
                </details>
              ))}
            </>
          )}
          {panel === "delete" && (
            <>
              <p>
                This deletes the note, original transcript, and version history.
                Existing tasks remain.
              </p>
              <button
                className="notes-danger"
                disabled={busy}
                onClick={() => void remove()}
              >
                Confirm deletion
              </button>
            </>
          )}
          {panel === "task" && taskForm}
        </div>
      </Modal>
      <Modal
        open={taskReviewOpen}
        onClose={() => {
          if (!busy) setTaskReviewOpen(false);
        }}
        title="Review & create task"
        size="lg"
      >
        <div className="notes-modal">{taskForm}</div>
      </Modal>
    </div>
  );
}
function InlineText({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^)]+\))/)
        .map((p, i) =>
          p.startsWith("**") ? (
            <strong key={i}>{p.slice(2, -2)}</strong>
          ) : p.startsWith("*") ? (
            <em key={i}>{p.slice(1, -1)}</em>
          ) : /^\[/.test(p) ? (
            (() => {
              const m = p.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
              return m ? (
                <a
                  key={i}
                  href={m[2]}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {m[1]}
                </a>
              ) : (
                p
              );
            })()
          ) : (
            p
          ),
        )}
    </>
  );
}
function NotePreview({
  body,
  onToggle,
}: {
  body: string;
  onToggle: (line: number) => void;
}) {
  return (
    <div className="notes-rendered">
      {body.split("\n").map((line, i) =>
        line.startsWith("## ") ? (
          <h3 key={i}>{line.slice(3)}</h3>
        ) : /^- \[[ xX]\]/.test(line) ? (
          <label className="notes-checklist" key={i}>
            <input
              type="checkbox"
              checked={/^- \[[xX]\]/.test(line)}
              onChange={() => onToggle(i)}
            />
            <InlineText text={line.slice(6)} />
          </label>
        ) : line.startsWith("- ") ? (
          <p className="notes-bullet" key={i}>
            • <InlineText text={line.slice(2)} />
          </p>
        ) : (
          <p key={i}>
            <InlineText text={line || "\u00a0"} />
          </p>
        ),
      )}
    </div>
  );
}
