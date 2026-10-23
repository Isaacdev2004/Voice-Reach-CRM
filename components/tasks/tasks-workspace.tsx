"use client";
import { useAiRecordContext } from "@/components/ai/ai-assistant-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AiLauncherButton } from "@/components/ai/ai-launcher-button";
import { Modal } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { TaskEditor, type TaskSeed } from "./task-editor";
import { TemplateAssignment } from "./template-assignment";
import { WorkspaceTaskRow } from "./task-row";
import { TasksHero } from "./tasks-hero";
import { TASK_TEMPLATES } from "@/lib/tasks/templates";
import {
  TaskMetaSchema,
  TaskEditSchema,
  PreferencesSchema,
  meta,
  priority,
  status,
  blocked,
  dateKey,
  filterTasks,
  metrics,
  sortTasks,
  groupLabel,
  transactionProgress,
  transactionSummary,
  type TaskRecord,
  type TaskPreferences,
  type TaskContact,
  type TaskMember,
  type TaskEdit,
  type TaskTemplate,
  type TaskTransaction,
} from "@/lib/tasks/workspace-model";
import { taskRequest } from "@/lib/tasks/client";
import type { z } from "zod";
import { zonedParts, wallTimeToInstant } from "@/lib/calendar/time";
import type { ProposalSchema } from "@/lib/tasks/ai";
import "./tasks-workspace.css";
type Data = {
  tasks: TaskRecord[];
  contacts: TaskContact[];
  members: TaskMember[];
  timezone: string;
  monday: boolean;
  inAppReminders: boolean;
  preferences: TaskPreferences;
  advanced: boolean;
  transactions: TaskTransaction[];
};
type Proposal = z.infer<typeof ProposalSchema>;
type SpeechResult = {
  results: { isFinal: boolean; 0: { transcript: string } }[];
};
type Speech = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechResult) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
const TAB_NAMES = {
  my: "My Tasks",
  templates: "Templates",
  checklists: "Transaction Checklists",
  contact: "By Contact",
  property: "By Property",
} as const;
const emptyData: Data = {
  tasks: [],
  contacts: [],
  members: [],
  timezone: "America/New_York",
  monday: true,
  inAppReminders: false,
  preferences: PreferencesSchema.parse({}),
  advanced: false,
  transactions: [],
};
export function TasksWorkspace() {
  const { user } = useUser();
  return (
    <Workspace
      key={user?.id ?? "signed-out"}
      owner={user?.id}
      name={user?.firstName ?? ""}
    />
  );
}
function Workspace({ owner, name }: { owner?: string; name: string }) {
  const query = useSearchParams(),
    [data, setData] = useState<Data>(emptyData),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [prefs, setPrefs] = useState<TaskPreferences>(PreferencesSchema.parse({})),
    [tab, setTab] = useState<keyof typeof TAB_NAMES>("my"),
    [showFilters, setShowFilters] = useState(false),
    [pending, setPending] = useState<string[]>([]),
    [editor, setEditor] = useState<{
      task?: TaskRecord;
      seed?: TaskSeed;
    } | null>(null),
    [template, setTemplate] = useState<TaskTemplate | null>(null),
    [templates, setTemplates] = useState<TaskTemplate[]>(TASK_TEMPLATES),
    [templatesError, setTemplatesError] = useState(false),
    [transaction, setTransaction] = useState<TaskTransaction | null>(null),
    [typeFilter, setTypeFilter] = useState("all"),
    [agentFilter, setAgentFilter] = useState("all"),
    [transactionState, setTransactionState] = useState("all"),
    [closingBefore, setClosingBefore] = useState("");
  const [appointments, setAppointments] = useState<
      { id: string; title: string; starts_at: string; source: string }[]
    >([]),
    [appointmentsError, setAppointmentsError] = useState(false),
    [goals, setGoals] = useState<{ id: string; title: string }[]>([]),
    [goalsError, setGoalsError] = useState(false),
    [now, setNow] = useState(new Date()),
    [source, setSource] = useState(""),
    [aiAction, setAiAction] = useState("Create"),
    [aiBusy, setAiBusy] = useState(false),
    [aiError, setAiError] = useState(""),
    [proposal, setProposal] = useState<Proposal | null>(null),
    [approved, setApproved] = useState(false),
    [listening, setListening] = useState(false),
    [dictationError, setDictationError] = useState(""),
    [updateDraft, setUpdateDraft] = useState<string | null>(null);
  const [aiNoteId, setAiNoteId] = useState(""),
    [sourceNotes, setSourceNotes] = useState<
      { id: string; title: string; body?: string }[]
    >([]);
  const [transactionEdit, setTransactionEdit] = useState<{
      id: string;
      name: string;
      closingDate: string;
      assigneeId: string;
    } | null>(null),
    [transactionError, setTransactionError] = useState("");
  useAiRecordContext({page:"/dashboard/tasks",taskId:editor?.task?.id,contactId:editor?.task?.contact_id});
  const proposalBatch = useRef(crypto.randomUUID()),
    proposalIds = useRef<string[]>([]);
  const loadedPrefs = useRef(false),
    initial = useRef(false),
    speech = useRef<Speech | null>(null),
    active = useRef(true),
    prefTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useCallback(
    <T,>(url: string, method = "GET", body?: unknown) =>
      taskRequest<T>(url, method, body, owner),
    [owner],
  );
  const refreshSerial = useRef(0),
    latestPrefs = useRef(prefs),
    prefsDirty = useRef(false);
  latestPrefs.current = prefs;
  const refresh = useCallback(async () => {
    if (!owner) return;
    const serial = ++refreshSerial.current;
    setLoading(true);
    setError("");
    try {
      const d = await request<Data>("/api/tasks/workspace");
      if (
        !Array.isArray(d.tasks) ||
        !Array.isArray(d.contacts) ||
        !Array.isArray(d.members) ||
        !Array.isArray(d.transactions)
      )
        throw Error();
      const parsed = PreferencesSchema.parse(d.preferences);
      if (!active.current || serial !== refreshSerial.current) return;
      setData(d);
      if (!loadedPrefs.current) {
        setPrefs(parsed);
        setTab(parsed.section);
        loadedPrefs.current = true;
      }
    } catch {
      if (active.current && serial === refreshSerial.current)
        setError(
          "Tasks could not be loaded. Refresh to retry; totals are unavailable.",
        );
    } finally {
      if (active.current && serial === refreshSerial.current) setLoading(false);
    }
  }, [owner, request]);
  useEffect(()=>{const reload=()=>{void refresh();};window.addEventListener("myari-assistant-record-saved",reload);return()=>window.removeEventListener("myari-assistant-record-saved",reload);},[refresh]);
  const loadTemplates = useCallback(async () => {
    try {
      const d = await request<{ templates: TaskTemplate[] }>(
        "/api/tasks/templates",
      );
      if (!Array.isArray(d.templates)) throw Error();
      setTemplates(d.templates);
      setTemplatesError(false);
    } catch {
      setTemplatesError(true);
    }
  }, [request]);
  useEffect(() => {
    active.current = true;
    void refresh();
    void loadTemplates();
    const again = () => void refresh();
    window.addEventListener("myari:activity-changed", again);
    window.addEventListener("focus", again);
    const tick = setInterval(() => setNow(new Date()), 60000);
    return () => {
      active.current = false;
      speech.current?.abort();
      clearInterval(tick);
      window.removeEventListener("myari:activity-changed", again);
      window.removeEventListener("focus", again);
      if (prefTimer.current) clearTimeout(prefTimer.current);
      if (prefsDirty.current && owner)
        void fetch("/api/tasks/preferences", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-MyARI-Owner": owner,
          },
          body: JSON.stringify(latestPrefs.current),
          keepalive: true,
        }).catch(() => {});
    };
  }, [refresh, loadTemplates, owner]);
  useEffect(() => {
    if (!loadedPrefs.current || loading || initial.current) return;
    initial.current = true;
    const contact = query.get("contactId"),
      property = query.get("propertyId"),
      q = query.get("q");
    if (contact && data.contacts.some((c) => c.id === contact))
      setPrefs((p) => ({ ...p, contactId: contact }));
    if (q) setPrefs((p) => ({ ...p, search: q }));
    if (query.get("tab") === "checklists") setTab("checklists");
    const selectedTask = data.tasks.find((t) => t.id === query.get("taskId"));
    if (selectedTask) setEditor({ task: selectedTask });
    if (query.get("new") === "task")
      setEditor({
        seed: {
          contactId: contact ?? undefined,
          propertyId: property ?? undefined,
          noteId: query.get("noteId") ?? undefined,
          campaignId: query.get("campaignId") ?? undefined,
          eventId: query.get("eventId") ?? undefined,
        },
      });
  }, [query, loading, data.contacts, data.tasks]);
  useEffect(() => {
    if (!owner || !loadedPrefs.current) return;
    if (prefTimer.current) clearTimeout(prefTimer.current);
    prefsDirty.current = true;
    prefTimer.current = setTimeout(() => {
      void request("/api/tasks/preferences", "POST", prefs)
        .then(() => {
          if (latestPrefs.current === prefs) prefsDirty.current = false;
        })
        .catch(() => {
          if (active.current)
            setNotice(
              "Your view preference could not be saved across devices. You can keep working and retry.",
            );
        });
    }, 600);
    return () => {
      if (prefTimer.current) clearTimeout(prefTimer.current);
    };
  }, [prefs, owner, request]);
  useEffect(() => {
    if (!owner) return;
    let alive = true;
    void request<{ agenda: typeof appointments }>(
      `/api/calendar/events?from=${encodeURIComponent(now.toISOString())}&to=${encodeURIComponent(new Date(+now + 7 * 86400000).toISOString())}`,
    )
      .then((r) => {
        if (alive) {
          setAppointments(
            r.agenda.filter((a) => a.source !== "task").slice(0, 6),
          );
          setAppointmentsError(false);
        }
      })
      .catch(() => {
        if (alive) setAppointmentsError(true);
      });
    void request<{
      notes: {
        id: string;
        title: string;
        kind: string;
        body?: string;
        metadata?: { category?: string };
      }[];
    }>("/api/notes/workspace")
      .then((r) => {
        if (alive) {
          setSourceNotes(r.notes);
          setGoals(
            r.notes.filter(
              (n) => n.kind === "goal" || n.metadata?.category === "Goals",
            ),
          );
          setGoalsError(false);
        }
      })
      .catch(() => {
        if (alive) setGoalsError(true);
      });
    return () => {
      alive = false;
    };
  }, [owner, now, request]);
  const patch = (value: Partial<TaskPreferences>) =>
    setPrefs((p) => ({ ...p, ...value }));
  const base = useMemo(
      () =>
        filterTasks(
          data.tasks,
          { ...prefs, status: "all" },
          data.contacts,
          data.timezone,
          now,
          data.monday,
          false,
        ),
      [data, prefs, now],
    ),
    stat = metrics(base, data.timezone, now, data.monday),
    allStat = metrics(data.tasks, data.timezone, now, data.monday),
    visible = sortTasks(
      filterTasks(
        data.tasks,
        prefs,
        data.contacts,
        data.timezone,
        now,
        data.monday,
      ),
      prefs.sort,
      prefs.focusOrder,
    );
  const todayKey = dateKey(now.toISOString(), data.timezone),
    todayTasks = data.tasks.filter(
      (t) => dateKey(t.due_at, data.timezone) === todayKey,
    ),
    focusTasks = sortTasks(
      visible.filter((t) => !t.completed && !blocked(t, data.tasks)),
      prefs.focusOrder.length ? "manual" : "priority",
      prefs.focusOrder,
    ).slice(0, 5);
  const reminders = data.inAppReminders
    ? data.tasks.filter(
        (t) =>
          !t.completed &&
          t.reminder_at &&
          Date.parse(t.reminder_at) <= +now &&
          !blocked(t, data.tasks),
      )
    : [];
  async function save(input: TaskEdit) {
    const r = await request<{ task: TaskRecord; calendar: string }>(
      "/api/tasks/workspace",
      "POST",
      input,
    );
    setNotice(r.calendar || "Task saved.");
    await refresh();
    window.dispatchEvent(new Event("myari:activity-changed"));
  }
  async function changeStatus(t: TaskRecord, next: string) {
    if (pending.includes(t.id)) return;
    setPending((p) => [...p, t.id]);
    setNotice("");
    try {
      const workspace = meta(t);
      if (next !== "completed")
        workspace.status = next as "todo" | "in_progress";
      await save(
        TaskEditSchema.parse({
          id: t.id,
          expectedUpdatedAt: t.updated_at,
          title: t.title,
          notes: t.notes ?? "",
          contactId: t.contact_id,
          dueAt: t.due_at,
          reminderAt: t.reminder_at ?? null,
          recurrence: t.recurrence ?? "none",
          priority: data.advanced ? priority(t) : "unspecified",
          completed: next === "completed",
          sourceNoteId: data.advanced ? (t.source_note_id ?? null) : null,
          workspace: data.advanced ? workspace : TaskMetaSchema.parse({}),
        }),
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Task could not be updated.");
    } finally {
      setPending((p) => p.filter((id) => id !== t.id));
    }
  }
  const toggle = (t: TaskRecord) =>
    void changeStatus(t, t.completed ? "todo" : "completed");
  async function remove(t: TaskRecord) {
    if (
      !window.confirm(
        `Delete “${t.title}”? A dependent task will remain blocked until its prerequisites are reviewed. This cannot be undone.`,
      )
    )
      return;
    try {
      await request(`/api/tasks/workspace?id=${t.id}`, "DELETE");
      await refresh();
      setNotice("Task deleted.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Task could not be deleted.");
    }
  }
  function dictate() {
    setDictationError("");
    patch({
      panelOpen: true,
      collapsed: prefs.collapsed.filter((id) => id !== "ai"),
    });
    if (listening) {
      speech.current?.stop();
      return;
    }
    const Recognition =
      (
        window as unknown as {
          SpeechRecognition?: new () => Speech;
          webkitSpeechRecognition?: new () => Speech;
        }
      ).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => Speech })
        .webkitSpeechRecognition;
    if (!Recognition) {
      setDictationError(
        "Voice dictation is not available in this browser. Type your request in AI Assist instead.",
      );
      return;
    }
    const r = new Recognition();
    speech.current = r;
    r.lang = "en-US";
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .filter((v) => v.isFinal)
        .map((v) => v[0].transcript)
        .join(" ");
      setSource((s) => `${s}${s ? " " : ""}${text}`);
      setProposal(null);
      setApproved(false);
    };
    r.onerror = () => {
      setDictationError(
        "Microphone access was unavailable. Your text is still here; type or retry.",
      );
      setListening(false);
    };
    r.onend = () => setListening(false);
    try {
      r.start();
      setListening(true);
      patch({ panelOpen: true });
    } catch {
      setDictationError(
        "Dictation could not start. Type your request instead.",
      );
    }
  }
  async function assist() {
    setAiBusy(true);
    setAiError("");
    setApproved(false);
    try {
      const p = await request<Proposal>("/api/tasks/ai", "POST", {
        source,
        action: aiAction,
        ...(aiNoteId || query.get("noteId")
          ? { noteId: aiNoteId || query.get("noteId") }
          : {}),
      });
      if (!Array.isArray(p.tasks) || !Array.isArray(p.questions)) throw Error();
      proposalBatch.current = crypto.randomUUID();
      proposalIds.current = [];
      setProposal(p);
    } catch (e) {
      setAiError(
        e instanceof Error
          ? e.message
          : "AI could not prepare a reliable draft.",
      );
    } finally {
      setAiBusy(false);
    }
  }
  async function approveProposals() {
    if (!proposal || !approved) return;
    setAiBusy(true);
    setAiError("");
    try {
      proposalIds.current = proposal.tasks.map(
        (_, i) => proposalIds.current[i] ?? crypto.randomUUID(),
      );
      await request("/api/tasks/proposals", "POST", {
        id: proposalBatch.current,
        approved: true,
        tasks: proposal.tasks.map((t, i) =>
          TaskEditSchema.parse({
            id: proposalIds.current[i],
            title: t.title,
            notes: t.notes,
            contactId: t.contactId,
            dueAt: t.dueAt,
            priority: t.priority,
            workspace: TaskMetaSchema.parse({ timezone: data.timezone }),
            sourceNoteId: aiNoteId || query.get("noteId") || null,
          }),
        ),
      });
      setProposal(null);
      setSource("");
      setApproved(false);
      await refresh();
      setNotice("Reviewed tasks created. Nothing was sent to clients.");
    } catch (e) {
      setAiError(
        e instanceof Error
          ? e.message
          : "Tasks could not be saved. Your reviewed draft is preserved.",
      );
    } finally {
      setAiBusy(false);
    }
  }
  const row = (t: TaskRecord) => (
    <WorkspaceTaskRow
      key={t.id}
      task={t}
      tasks={data.tasks}
      contacts={data.contacts}
      members={data.members}
      timezone={data.timezone}
      pending={pending.includes(t.id)}
      advanced={data.advanced}
      onToggle={toggle}
      onEdit={(task) => setEditor({ task })}
      onDelete={(task) => void remove(task)}
      onStatus={(task, s) => void changeStatus(task, s)}
    />
  );
  const groups = visible.reduce<Record<string, TaskRecord[]>>((g, t) => {
    const label =
      tab === "contact"
        ? [
            data.contacts.find((c) => c.id === t.contact_id)?.first_name,
            data.contacts.find((c) => c.id === t.contact_id)?.last_name,
          ]
            .filter(Boolean)
            .join(" ") || "Personal tasks"
        : tab === "property"
          ? (data.contacts.find((c) => c.id === meta(t).propertyContactId)
              ?.property_address ?? "No linked property")
          : groupLabel(t, data.timezone, now);
    (g[label] ??= []).push(t);
    return g;
  }, {});
  const filteredTransactions = data.transactions.filter(
    (t) =>
      (typeFilter === "all" || t.payload.kind === typeFilter) &&
      (agentFilter === "all" || t.payload.assigneeId === agentFilter) &&
      (!closingBefore ||
        (!!t.payload.closingDate && t.payload.closingDate <= closingBefore)) &&
      (prefs.contactId === "all" || t.contact_id === prefs.contactId) &&
      (transactionState === "all" ||
        (transactionState === "complete"
          ? transactionProgress(t, data.tasks, data.timezone, now).percent ===
            100
          : transactionProgress(t, data.tasks, data.timezone, now).percent <
            100)),
  );
  const panel = (id: string) => !prefs.collapsed.includes(id),
    collapse = (id: string) =>
      patch({
        collapsed: panel(id)
          ? [...prefs.collapsed, id]
          : prefs.collapsed.filter((x) => x !== id),
      });
  return (
    <div className="tasks-workspace">
      <TasksHero
        name={name}
        today={allStat.today}
        completed={todayTasks.filter((t) => t.completed).length}
        total={todayTasks.length}
        loading={loading}
        error={!!error}
      />
      <nav className="tw-tabs" aria-label="Task sections">
        {Object.entries(TAB_NAMES).map(([id, label]) => (
          <button
            key={id}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => {
              setTab(id as keyof typeof TAB_NAMES);
              patch({ section: id as TaskPreferences["section"] });
            }}
          >
            {label}
          </button>
        ))}
        <Link href="/dashboard/calendar">Calendar View</Link>
        <div className="tw-toolbar-actions">
          <AiLauncherButton label="Ask MyARI" />
          <button aria-label="Dictate task" onClick={dictate}>
            <Icon name="mic" />
            {listening ? "Stop dictation" : "Dictate task"}
          </button>
          <button
            aria-label="New task"
            className="tw-primary"
            disabled={loading || !!error}
            onClick={() => setEditor({})}
          >
            <Icon name="add" />
            New task
          </button>
        </div>
      </nav>
      {dictationError && (
        <p role="status" className="tw-notice">
          {dictationError}
        </p>
      )}
      {error && (
        <div role="alert" className="tw-error">
          {error}
          <button onClick={() => void refresh()}>Retry tasks</button>
        </div>
      )}
      {notice && (
        <p className="tw-notice" role="status">
          {notice}
        </p>
      )}
      {!loading && !data.advanced && !error && (
        <p className="tw-capability">
          Basic tasks are available. Board status changes, task relationships
          and checklist assignment require the reviewed Tasks workspace update.
        </p>
      )}
      <div className={`tw-layout ${!prefs.panelOpen ? "tw-wide" : ""}`}>
        <main>
          <div className="tw-metrics">
            {(
              [
                {
                  title: "Open Tasks",
                  value: stat.open,
                  icon: "assignment",
                  scope: "all",
                  status: "open",
                },
                {
                  title: "Completed This Week",
                  value: stat.completed,
                  icon: "task_alt",
                  scope: "completed-week",
                  status: "all",
                },
                {
                  title: "Due This Week",
                  value: stat.due,
                  icon: "calendar_today",
                  scope: "due-week",
                  status: "all",
                },
                {
                  title: "Overdue",
                  value: stat.overdue,
                  icon: "target",
                  scope: "overdue",
                  status: "all",
                },
              ] as const
            ).map((m, i) => (
              <button
                key={m.title}
                className={`tw-kpi ${i === 3 && stat.overdue ? "tw-kpi-alert" : ""}`}
                onClick={() => {
                  patch({ scope: m.scope, status: m.status });
                  setTab("my");
                }}
              >
                <span className="tw-kpi-icon">
                  {!loading && !error && i === 1 && stat.weekTotal > 0 ? (
                    <span
                      className="tw-kpi-ring"
                      style={{
                        background: `conic-gradient(#a77b58 ${(stat.weekDone / stat.weekTotal) * 360}deg,#f0ebe4 0deg)`,
                      }}
                    >
                      <b>
                        {Math.round((stat.weekDone / stat.weekTotal) * 100)}%
                      </b>
                    </span>
                  ) : (
                    <Icon name={m.icon} />
                  )}
                </span>
                <span>
                  <small>{m.title}</small>
                  <strong>{loading ? "…" : error ? "—" : m.value}</strong>
                  <em>
                    {loading || error
                      ? ""
                      : i === 1
                        ? stat.weekTotal
                          ? `${stat.weekDone} of ${stat.weekTotal} due-week tasks complete`
                          : "No due-week progress to measure"
                        : i === 2
                          ? "Calendar week"
                          : i === 3
                            ? "Before today, still open"
                            : "Your matching open tasks"}
                  </em>
                </span>
              </button>
            ))}
          </div>
          <div className="tw-view-controls">
            <div>
              {["list", "board", "focus", "grid"].map((view) => (
                <button
                  key={view}
                  aria-pressed={prefs.view === view}
                  onClick={() =>
                    patch({ view: view as TaskPreferences["view"] })
                  }
                >
                  {view[0].toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
            <button
              aria-expanded={prefs.panelOpen}
              onClick={() => patch({ panelOpen: !prefs.panelOpen })}
            >
              {prefs.panelOpen ? "Hide task tools" : "Show task tools"}
            </button>
          </div>
          {tab === "templates" ? (
            <section className="tw-card">
              <div className="tw-section-title">
                <h2>Templates for your next chapter.</h2>
                <span>Review, customize, then assign</span>
              </div>
              {templatesError && (
                <p className="tw-notice">
                  Custom templates are unavailable. Built-in starting points
                  remain below.{" "}
                  <button onClick={() => void loadTemplates()}>
                    Retry templates
                  </button>
                </p>
              )}
              <div className="tw-template-grid">
                {templates.map((t) => (
                  <button key={t.id} onClick={() => setTemplate(t)}>
                    <Icon
                      name={
                        t.kind === "buyer"
                          ? "home"
                          : t.kind === "listing"
                            ? "description"
                            : "checklist"
                      }
                    />
                    <h3>{t.name}</h3>
                    <p>{t.steps.length} editable tasks · proposed dates</p>
                    <span>Review template →</span>
                  </button>
                ))}
              </div>
            </section>
          ) : tab === "checklists" ? (
            <section className="tw-card">
              <div className="tw-section-title">
                <h2>Transaction checklists</h2>
                <button onClick={() => setTemplate(TASK_TEMPLATES[0])}>
                  + Assign checklist
                </button>
              </div>
              <div className="tw-filter-fields">
                <label>
                  Type
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="all">All types</option>
                    <option value="buyer">Buyer</option>
                    <option value="listing">Listing</option>
                    <option value="checklist">Other checklists</option>
                  </select>
                </label>
                <label>
                  Agent
                  <select
                    value={agentFilter}
                    onChange={(e) => setAgentFilter(e.target.value)}
                  >
                    <option value="all">All agents</option>
                    {data.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Progress
                  <select
                    value={transactionState}
                    onChange={(e) => setTransactionState(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="active">In progress</option>
                    <option value="complete">Completed</option>
                  </select>
                </label>
                <label>
                  Closing by
                  <input
                    type="date"
                    value={closingBefore}
                    onChange={(e) => setClosingBefore(e.target.value)}
                  />
                </label>
              </div>
              {filteredTransactions.length ? (
                filteredTransactions.map((t) => {
                  const p = transactionProgress(
                    t,
                    data.tasks,
                    data.timezone,
                    now,
                  );
                  return (
                    <button
                      key={t.id}
                      className="tw-transaction"
                      onClick={() => setTransaction(t)}
                    >
                      <span>
                        <b>{t.payload.name}</b>
                        <small>
                          {data.contacts.find((c) => c.id === t.contact_id)
                            ?.first_name || "Client"}{" "}
                          ·{" "}
                          {data.contacts.find(
                            (c) => c.id === t.payload.propertyContactId,
                          )?.property_address || "No property linked"}
                        </small>
                        <small>
                          Closing: {t.payload.closingDate || "Not recorded"} ·{" "}
                          {p.stage}
                        </small>
                      </span>
                      <span className="tw-transaction-progress">
                        <b>{p.percent}%</b>
                        <span className="tw-progress">
                          <span style={{ width: `${p.percent}%` }} />
                        </span>
                        <small>
                          {p.done}/{p.total} complete · {p.overdue} overdue
                          {p.missing ? ` · ${p.missing} missing` : ""}
                        </small>
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="tw-empty">
                  <Icon name="real_estate_agent" />
                  <h3>Your next transaction starts here.</h3>
                  <p>
                    Assign a reviewed buyer or listing checklist to an existing
                    client.
                  </p>
                </div>
              )}
            </section>
          ) : (
            <section className="tw-card tw-list-card">
              <div className="tw-section-title">
                <h2>
                  {prefs.view === "focus" ? "Your daily focus" : "My tasks"}
                </h2>
                <div className="tw-actions">
                  <input
                    aria-label="Search tasks"
                    type="search"
                    placeholder="Search tasks…"
                    value={prefs.search}
                    onChange={(e) => patch({ search: e.target.value })}
                  />
                  <button
                    aria-label="Filter"
                    aria-expanded={showFilters}
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    Filter <Icon name="expand_more" />
                  </button>
                  <label className="tw-inline-label">
                    Sort
                    <select
                      aria-label="Sort tasks"
                      value={prefs.sort}
                      onChange={(e) =>
                        patch({
                          sort: e.target.value as TaskPreferences["sort"],
                        })
                      }
                    >
                      <option value="due">Due date</option>
                      <option value="priority">Priority</option>
                      <option value="title">Title</option>
                      <option value="manual">Manual focus order</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="tw-scope-tabs">
                {(
                  [
                    ["all", "All"],
                    ["today", "Today"],
                    ["upcoming", "Upcoming"],
                    ["overdue", "Overdue"],
                    ["high", "High Priority"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    aria-pressed={prefs.scope === id}
                    onClick={() => patch({ scope: id })}
                  >
                    {label} (
                    {
                      filterTasks(
                        base,
                        {
                          ...prefs,
                          search: "",
                          contactId: "all",
                          propertyId: "all",
                          assigneeId: "all",
                          priority: "all",
                          status: "all",
                          scope: id,
                        },
                        data.contacts,
                        data.timezone,
                        now,
                        data.monday,
                      ).length
                    }
                    )
                  </button>
                ))}
              </div>
              {showFilters && (
                <div className="tw-filter-fields">
                  <label>
                    Priority
                    <select
                      aria-label="Filter priority"
                      value={prefs.priority}
                      onChange={(e) =>
                        patch({
                          priority: e.target
                            .value as TaskPreferences["priority"],
                        })
                      }
                    >
                      {["all", "high", "medium", "low", "unspecified"].map(
                        (p) => (
                          <option key={p}>{p}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    Status
                    <select
                      aria-label="Filter status"
                      value={prefs.status}
                      onChange={(e) =>
                        patch({
                          status: e.target.value as TaskPreferences["status"],
                        })
                      }
                    >
                      {["all", "open", "todo", "in_progress", "completed"].map(
                        (p) => (
                          <option key={p}>{p}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    Contact
                    <select
                      aria-label="Filter contact"
                      value={prefs.contactId}
                      onChange={(e) => patch({ contactId: e.target.value })}
                    >
                      <option value="all">All contacts</option>
                      {data.contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.first_name} {c.last_name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Property
                    <select
                      aria-label="Filter property"
                      value={prefs.propertyId}
                      onChange={(e) => patch({ propertyId: e.target.value })}
                    >
                      <option value="all">All properties</option>
                      {data.contacts
                        .filter((c) => c.property_address)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.property_address}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Assignee
                    <select
                      aria-label="Filter assignee"
                      value={prefs.assigneeId}
                      onChange={(e) => patch({ assigneeId: e.target.value })}
                    >
                      <option value="all">All assignees</option>
                      {data.members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Due from
                    <input
                      aria-label="Due from"
                      type="date"
                      value={prefs.fromDate}
                      onChange={(e) => patch({ fromDate: e.target.value })}
                    />
                  </label>
                  <label>
                    Due through
                    <input
                      aria-label="Due through"
                      type="date"
                      value={prefs.toDate}
                      onChange={(e) => patch({ toDate: e.target.value })}
                    />
                  </label>
                  <button
                    onClick={() =>
                      setPrefs((p) => ({
                        ...p,
                        scope: "all",
                        search: "",
                        priority: "all",
                        status: "all",
                        contactId: "all",
                        propertyId: "all",
                        assigneeId: "all",
                        fromDate: "",
                        toDate: "",
                      }))
                    }
                  >
                    Clear filters
                  </button>
                </div>
              )}
              <div className="tw-active-filters">
                {(
                  [
                    [
                      "priority",
                      prefs.priority === "all"
                        ? ""
                        : `Priority: ${prefs.priority}`,
                    ],
                    [
                      "status",
                      prefs.status === "all" ? "" : `Status: ${prefs.status}`,
                    ],
                    [
                      "contactId",
                      prefs.contactId === "all"
                        ? ""
                        : `Contact: ${data.contacts.find((c) => c.id === prefs.contactId)?.first_name ?? "Unavailable contact"}`,
                    ],
                    [
                      "propertyId",
                      prefs.propertyId === "all"
                        ? ""
                        : `Property: ${data.contacts.find((c) => c.id === prefs.propertyId)?.property_address ?? "Unavailable property"}`,
                    ],
                    [
                      "assigneeId",
                      prefs.assigneeId === "all"
                        ? ""
                        : `Assignee: ${data.members.find((m) => m.id === prefs.assigneeId)?.name ?? "Unavailable assignee"}`,
                    ],
                    [
                      "fromDate",
                      prefs.fromDate ? `From: ${prefs.fromDate}` : "",
                    ],
                    ["toDate", prefs.toDate ? `Through: ${prefs.toDate}` : ""],
                  ] as const
                )
                  .filter(([, label]) => label)
                  .map(([key, label]) => (
                    <button
                      key={key}
                      aria-label={`Remove ${label}`}
                      onClick={() =>
                        patch({
                          [key]:
                            key === "fromDate" || key === "toDate" ? "" : "all",
                        })
                      }
                    >
                      {label} ×
                    </button>
                  ))}
              </div>
              <p className="tw-date-caption">
                {now.toLocaleDateString(undefined, {
                  timeZone: data.timezone,
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                · {data.timezone} ·{" "}
                {error
                  ? "Counts unavailable"
                  : `${visible.length} matching tasks`}
              </p>
              {loading ? (
                <div className="tw-empty" role="status">
                  Loading your tasks…
                </div>
              ) : error ? (
                <div className="tw-empty">
                  Tasks unavailable. Retry to load your workspace.
                </div>
              ) : !visible.length ? (
                <div className="tw-empty">
                  <Icon name="task_alt" />
                  <h3>A clear view for what comes next.</h3>
                  <p>No tasks match these filters.</p>
                  <button onClick={() => setEditor({})}>Create a task</button>
                </div>
              ) : prefs.view === "board" ? (
                <div className="tw-board">
                  {["todo", "in_progress", "completed"].map((s) => (
                    <div className="tw-board-column" key={s}>
                      <h3>
                        {s === "todo"
                          ? "To Do"
                          : s === "in_progress"
                            ? "In Progress"
                            : "Completed"}{" "}
                        <small>
                          {visible.filter((t) => status(t) === s).length}
                        </small>
                      </h3>
                      {visible.filter((t) => status(t) === s).map(row)}
                    </div>
                  ))}
                </div>
              ) : prefs.view === "focus" ? (
                <>
                  <p className="tw-muted">
                    Five actionable priorities, using stored priority and due
                    dates. Blocked tasks are excluded; urgency is not invented.
                  </p>
                  {focusTasks.length ? (
                    focusTasks.map((t, i) => (
                      <div key={t.id} className="tw-focus-row">
                        <div className="tw-focus-order">
                          <button
                            aria-label={`Move up ${t.title}`}
                            disabled={i === 0}
                            onClick={() => {
                              const ids = focusTasks.map((t) => t.id);
                              [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
                              patch({ focusOrder: ids });
                            }}
                          >
                            ↑
                          </button>
                          <button
                            aria-label={`Move down ${t.title}`}
                            disabled={i === focusTasks.length - 1}
                            onClick={() => {
                              const ids = focusTasks.map((t) => t.id);
                              [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]];
                              patch({ focusOrder: ids });
                            }}
                          >
                            ↓
                          </button>
                        </div>
                        {row(t)}
                      </div>
                    ))
                  ) : (
                    <div className="tw-empty">
                      No actionable tasks match this view. Review blocked tasks
                      or your filters.
                    </div>
                  )}
                  <h3>Upcoming appointments</h3>
                  {appointmentsError ? (
                    <p className="tw-muted">
                      Appointments are unavailable.{" "}
                      <Link href="/dashboard/calendar">Open Calendar</Link>
                    </p>
                  ) : appointments.length ? (
                    appointments.map((a) => (
                      <Link
                        className="tw-appointment"
                        key={a.id}
                        href="/dashboard/calendar"
                      >
                        <Icon name="event" />
                        <span>{a.title}</span>
                        <time>
                          {new Date(a.starts_at).toLocaleString(undefined, {
                            timeZone: data.timezone,
                          })}
                        </time>
                      </Link>
                    ))
                  ) : (
                    <p className="tw-muted">
                      No appointments in the next seven days.
                    </p>
                  )}
                </>
              ) : prefs.view === "grid" ? (
                <div className="tw-grid">{visible.map(row)}</div>
              ) : (
                Object.entries(groups).map(([label, rows]) => (
                  <section className="tw-task-group" key={label}>
                    <h3>
                      {label}
                      <small>
                        {rows.length} {rows.length === 1 ? "task" : "tasks"}
                      </small>
                    </h3>
                    {rows.map(row)}
                  </section>
                ))
              )}
            </section>
          )}
        </main>
        {prefs.panelOpen && (
          <aside className="tw-sidebar">
            <section className="tw-card">
              <button
                className="tw-panel-heading"
                aria-expanded={panel("ai")}
                onClick={() => collapse("ai")}
              >
                <h2>
                  <Icon name="auto_awesome" /> AI Assist
                </h2>
                <Icon name="expand_more" />
              </button>
              {panel("ai") && (
                <>
                  <p className="tw-muted">
                    Turn your own instructions into proposals. Review everything
                    before creating tasks.
                  </p>
                  <label className="tw-ai-action">
                    Action
                    <select
                      aria-label="AI task action"
                      value={aiAction}
                      onChange={(e) => setAiAction(e.target.value)}
                    >
                      {[
                        "Create",
                        "Summarize",
                        "Prioritize",
                        "Break down",
                        "Suggest follow-ups",
                        "From Note",
                        "Transaction update",
                      ].map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </label>
                  {aiAction === "From Note" && (
                    <label className="tw-muted">
                      Source note
                      <select
                        aria-label="Source note"
                        value={aiNoteId}
                        onChange={(e) => {
                          setAiNoteId(e.target.value);
                          setSource(
                            sourceNotes.find((n) => n.id === e.target.value)
                              ?.body ?? "",
                          );
                          setApproved(false);
                        }}
                      >
                        <option value="">Select a saved note</option>
                        {sourceNotes.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.title || "Untitled note"}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <textarea
                    aria-label="Task instructions"
                    placeholder="Tell me what you need to do…"
                    value={source}
                    onChange={(e) => {
                      setSource(e.target.value);
                      setApproved(false);
                    }}
                  />
                  <div className="tw-actions">
                    <button onClick={dictate}>
                      <Icon name="mic" />
                      {listening ? "Stop" : "Dictate"}
                    </button>
                    <button
                      className="tw-primary"
                      disabled={aiBusy || !source.trim() || !!error}
                      onClick={() => void assist()}
                    >
                      {aiBusy ? "Preparing…" : "Review suggestions"}
                    </button>
                  </div>
                  {aiError && (
                    <p role="alert" className="tw-error">
                      {aiError}
                    </p>
                  )}
                </>
              )}
            </section>
            <section className="tw-card">
              <button
                className="tw-panel-heading"
                aria-expanded={panel("templates")}
                onClick={() => collapse("templates")}
              >
                <h2>Quick task templates</h2>
                <Icon name="expand_more" />
              </button>
              {panel("templates") && (
                <>
                  {[
                    "buyer-contract",
                    "listing-contract",
                    "buyer-nurture",
                    "open-house",
                    "price-reduction",
                  ]
                    .map((id) => templates.find((t) => t.id === id))
                    .filter((t): t is TaskTemplate => !!t)
                    .map((t) => (
                      <button
                        key={t.id}
                        className="tw-template-link"
                        onClick={() => setTemplate(t)}
                      >
                        <Icon
                          name={t.kind === "buyer" ? "home" : "checklist"}
                        />
                        <span>
                          <b>
                            {{
                              "buyer-contract": "Buyer transaction checklist",
                              "listing-contract":
                                "Listing transaction checklist",
                              "buyer-nurture": "New lead nurture",
                              "open-house": "Open house checklist",
                              "price-reduction": "Price reduction checklist",
                            }[t.id] ?? t.name}
                          </b>
                          <small>{t.steps.length} editable steps</small>
                        </span>
                        <Icon name="chevron_right" />
                      </button>
                    ))}
                  <button onClick={() => setTab("templates")}>
                    View all templates →
                  </button>
                </>
              )}
            </section>
            <section className="tw-card">
              <button
                className="tw-panel-heading"
                aria-expanded={panel("goals")}
                onClick={() => collapse("goals")}
              >
                <h2>Goals &amp; focus</h2>
                <Icon name="expand_more" />
              </button>
              {panel("goals") &&
                (goalsError ? (
                  <p className="tw-muted">
                    Goals are unavailable.{" "}
                    <Link href="/dashboard/notes">Open Notes</Link>
                  </p>
                ) : goals.length ? (
                  goals.map((g) => {
                    const linked = data.tasks.filter(
                        (t) => t.source_note_id === g.id,
                      ),
                      done = linked.filter((t) => t.completed).length;
                    return (
                      <Link
                        className="tw-goal"
                        key={g.id}
                        href={`/dashboard/notes?note=${g.id}`}
                      >
                        <b>{g.title}</b>
                        {linked.length ? (
                          <>
                            <small>
                              {done} of {linked.length} linked tasks complete
                            </small>
                            <span className="tw-progress">
                              <span
                                style={{
                                  width: `${(done / linked.length) * 100}%`,
                                }}
                              />
                            </span>
                          </>
                        ) : (
                          <small>No linked task progress recorded</small>
                        )}
                      </Link>
                    );
                  })
                ) : (
                  <p className="tw-muted">
                    Your saved goals will appear here.{" "}
                    <Link href="/dashboard/notes">Plan in Notes</Link>
                  </p>
                ))}
            </section>
            {data.inAppReminders && (
              <section className="tw-card">
                <h2>In-app reminders</h2>
                {reminders.length ? (
                  reminders.map((t) => (
                    <button
                      className="tw-template-link"
                      key={t.id}
                      onClick={() => setEditor({ task: t })}
                    >
                      <Icon name="notifications" />
                      {t.title}
                    </button>
                  ))
                ) : (
                  <p className="tw-muted">No reminders due.</p>
                )}
                <small>
                  Shown while this workspace is open. External calendar
                  notifications depend on your provider settings.
                </small>
              </section>
            )}
          </aside>
        )}
      </div>
      <TaskEditor
        open={!!editor}
        onClose={() => setEditor(null)}
        onSave={save}
        task={editor?.task}
        seed={editor?.seed}
        contacts={data.contacts}
        members={data.members}
        tasks={data.tasks}
        timezone={data.timezone}
        advanced={data.advanced}
      />
      <TemplateAssignment
        template={template}
        onClose={() => setTemplate(null)}
        contacts={data.contacts}
        members={data.members}
        timezone={data.timezone}
        advanced={data.advanced}
        onAssign={async (body) => {
          const r = await request<{ duplicate?: boolean }>(
            "/api/tasks/checklists",
            "POST",
            body,
          );
          await refresh();
          setTab("checklists");
          setNotice(
            r.duplicate
              ? "This checklist was already assigned; no duplicate tasks were created."
              : "Reviewed checklist assigned. Proposed dates remain editable.",
          );
        }}
        onSaveTemplate={async (body) => {
          await request("/api/tasks/templates", "POST", body);
          await loadTemplates();
        }}
      />
      <Modal
        open={!!proposal}
        onClose={() => {
          if (!aiBusy) setProposal(null);
        }}
        title="Review AI suggestions"
        size="xl"
      >
        {proposal && (
          <div className="tw-editor">
            <p>{proposal.summary}</p>
            {proposal.questions.length > 0 && (
              <div className="tw-notice">
                <b>Clarify before approving</b>
                <ul>
                  {proposal.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
                <p>
                  Resolve these points in the editable proposals below, or
                  return to your instructions.
                </p>
              </div>
            )}
            {proposal.tasks.map((t, i) => (
              <fieldset key={i}>
                <legend>Proposed task {i + 1}</legend>
                <label>
                  Title
                  <input
                    value={t.title}
                    onChange={(e) => {
                      setApproved(false);
                      setProposal((p) =>
                        p
                          ? {
                              ...p,
                              tasks: p.tasks.map((t, n) =>
                                n === i ? { ...t, title: e.target.value } : t,
                              ),
                            }
                          : p,
                      );
                    }}
                  />
                </label>
                <label>
                  Description
                  <textarea
                    value={t.notes}
                    onChange={(e) => {
                      setApproved(false);
                      setProposal((p) =>
                        p
                          ? {
                              ...p,
                              tasks: p.tasks.map((t, n) =>
                                n === i ? { ...t, notes: e.target.value } : t,
                              ),
                            }
                          : p,
                      );
                    }}
                  />
                </label>
                <label>
                  Client
                  <select
                    value={t.contactId ?? ""}
                    onChange={(e) => {
                      setApproved(false);
                      setProposal((p) =>
                        p
                          ? {
                              ...p,
                              tasks: p.tasks.map((t, n) =>
                                n === i
                                  ? { ...t, contactId: e.target.value || null }
                                  : t,
                              ),
                            }
                          : p,
                      );
                    }}
                  >
                    <option value="">Personal task</option>
                    {data.contacts
                      .filter((c) => c.type !== "Personal Tasks")
                      .map((c) => (
                        <option value={c.id} key={c.id}>
                          {c.first_name} {c.last_name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Due date (optional)
                  <input
                    type="datetime-local"
                    value={
                      t.dueAt
                        ? `${zonedParts(t.dueAt, data.timezone).date}T${zonedParts(t.dueAt, data.timezone).time}`
                        : ""
                    }
                    onChange={(e) => {
                      try {
                        const [day, clock] = e.target.value.split("T"),
                          dueAt = e.target.value
                            ? wallTimeToInstant(day, clock, data.timezone)
                            : null;
                        setApproved(false);
                        setProposal((p) =>
                          p
                            ? {
                                ...p,
                                tasks: p.tasks.map((t, n) =>
                                  n === i ? { ...t, dueAt } : t,
                                ),
                              }
                            : p,
                        );
                        setAiError("");
                      } catch {
                        setAiError(
                          "Choose a valid local time. For daylight saving changes, choose an unambiguous time.",
                        );
                      }
                    }}
                  />
                </label>
                <small>Scheduling timezone: {data.timezone}.</small>
                <label>
                  Priority
                  <select
                    value={t.priority}
                    onChange={(e) => {
                      setApproved(false);
                      setProposal((p) =>
                        p
                          ? {
                              ...p,
                              tasks: p.tasks.map((t, n) =>
                                n === i
                                  ? {
                                      ...t,
                                      priority: e.target
                                        .value as typeof t.priority,
                                    }
                                  : t,
                              ),
                            }
                          : p,
                      );
                    }}
                  >
                    {["unspecified", "high", "medium", "low"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <blockquote>{t.quote}</blockquote>
              </fieldset>
            ))}
            <label className="tw-check">
              <input
                type="checkbox"
                checked={approved}
                onChange={(e) => setApproved(e.target.checked)}
              />
              I resolved any questions and reviewed every task, contact,
              priority and date. Create these tasks.
            </label>
            {aiError && (
              <p role="alert" className="tw-error">
                {aiError}
              </p>
            )}
            <button
              className="tw-primary"
              disabled={
                !data.advanced || !approved || aiBusy || !proposal.tasks.length
              }
              onClick={() => void approveProposals()}
            >
              {aiBusy ? "Saving…" : "Create approved tasks"}
            </button>
          </div>
        )}
      </Modal>
      <Modal
        open={!!transaction}
        onClose={() => setTransaction(null)}
        title="Transaction checklist"
        size="xl"
      >
        {transaction &&
          (() => {
            const t =
                data.transactions.find((r) => r.id === transaction.id) ??
                transaction,
              p = transactionProgress(t, data.tasks, data.timezone, now),
              client = data.contacts.find((c) => c.id === t.contact_id);
            return (
              <div className="tw-editor">
                <h2>{t.payload.name}</h2>
                <p>
                  {client?.first_name} {client?.last_name} · {p.stage}
                </p>
                <p>
                  {p.done} of {p.total} milestones complete · {p.overdue}{" "}
                  overdue
                  {p.missing
                    ? ` · ${p.missing} deleted milestones require review`
                    : ""}
                </p>
                <span className="tw-progress">
                  <span style={{ width: `${p.percent}%` }} />
                </span>
                <p className="tw-muted">
                  Dates are proposed task deadlines, not a legal determination.
                  Verify against your agreement.
                </p>
                <div className="tw-actions">
                  <Link href={`/dashboard/contacts/${t.contact_id}`}>
                    Open contact
                  </Link>
                  {t.payload.propertyContactId && (
                    <Link
                      href={`/dashboard/properties?contactId=${t.payload.propertyContactId}`}
                    >
                      Open property
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setSource(
                        transactionSummary(t, data.tasks, data.timezone, now),
                      );
                      setAiAction("Transaction update");
                      setAiNoteId("");
                      patch({
                        panelOpen: true,
                        collapsed: prefs.collapsed.filter((id) => id !== "ai"),
                      });
                      setTransaction(null);
                      setNotice(
                        "Actual transaction context loaded into AI Assist. Review instructions before requesting a draft.",
                      );
                    }}
                  >
                    Prepare AI progress summary
                  </button>
                  <button
                    onClick={() => {
                      setTransactionError("");
                      setTransactionEdit({
                        id: t.id,
                        name: t.payload.name,
                        closingDate: t.payload.closingDate ?? "",
                        assigneeId: t.payload.assigneeId,
                      });
                    }}
                  >
                    Edit transaction
                  </button>
                  <Link href={`/dashboard/notes?contactId=${t.contact_id}`}>
                    Related notes
                  </Link>
                  <Link href={`/dashboard/calendar?contactId=${t.contact_id}`}>
                    Calendar
                  </Link>
                  <Link
                    href={`/dashboard/contacts/${t.contact_id}?tab=activity`}
                  >
                    Activity timeline
                  </Link>
                  <button
                    onClick={() =>
                      setUpdateDraft(
                        `Hi ${client?.first_name || "there"},\n\nHere is the latest recorded progress on your transaction:\n\n${transactionSummary(t, data.tasks, data.timezone, now)}\n\nPlease let me know if you have any questions.`,
                      )
                    }
                  >
                    Draft client update
                  </button>
                </div>
                {t.payload.taskIds
                  .map((id) => data.tasks.find((r) => r.id === id))
                  .map((task, i) =>
                    task ? (
                      row(task)
                    ) : (
                      <p className="tw-notice" key={t.payload.taskIds[i]}>
                        Milestone removed. Review this checklist before
                        considering it complete.
                      </p>
                    ),
                  )}
              </div>
            );
          })()}
      </Modal>
      <Modal
        open={!!transactionEdit}
        onClose={() => setTransactionEdit(null)}
        title="Edit transaction"
      >
        <form
          className="tw-editor"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!transactionEdit) return;
            setTransactionError("");
            try {
              await request("/api/tasks/transactions", "PATCH", {
                ...transactionEdit,
                closingDate: transactionEdit.closingDate || null,
              });
              setTransactionEdit(null);
              await refresh();
              setNotice(
                "Transaction details saved. Milestone dates remain individually editable.",
              );
            } catch (e) {
              setTransactionError(
                e instanceof Error ? e.message : "Please retry.",
              );
            }
          }}
        >
          {transactionEdit && (
            <>
              <label>
                Transaction name
                <input
                  required
                  value={transactionEdit.name}
                  onChange={(e) =>
                    setTransactionEdit({
                      ...transactionEdit,
                      name: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Expected closing date
                <input
                  type="date"
                  value={transactionEdit.closingDate}
                  onChange={(e) =>
                    setTransactionEdit({
                      ...transactionEdit,
                      closingDate: e.target.value,
                    })
                  }
                />
              </label>
              <label>
                Assigned agent
                <select
                  value={transactionEdit.assigneeId}
                  onChange={(e) =>
                    setTransactionEdit({
                      ...transactionEdit,
                      assigneeId: e.target.value,
                    })
                  }
                >
                  {data.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="tw-muted">
                Changing the expected closing date does not move milestone
                deadlines. Review each task against your agreement.
              </p>
              {transactionError && (
                <p role="alert" className="tw-error">
                  {transactionError}
                </p>
              )}
              <button type="submit" className="tw-primary">
                Save transaction
              </button>
            </>
          )}
        </form>
      </Modal>
      <Modal
        open={updateDraft !== null}
        onClose={() => setUpdateDraft(null)}
        title="Review client update"
      >
        <div className="tw-editor">
          <p className="tw-muted">
            Based on recorded task progress. Review and edit before sharing;
            nothing is sent automatically.
          </p>
          <textarea
            aria-label="Client update draft"
            rows={12}
            value={updateDraft ?? ""}
            onChange={(e) => setUpdateDraft(e.target.value)}
          />
          <button
            onClick={() =>
              void navigator.clipboard
                .writeText(updateDraft ?? "")
                .then(() => setNotice("Reviewed update copied."))
                .catch(() =>
                  setNotice(
                    "Copy was unavailable. Select the text to copy it manually.",
                  ),
                )
            }
          >
            Copy update
          </button>
        </div>
      </Modal>
    </div>
  );
}
