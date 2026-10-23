"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { plannerRange } from "@/lib/notes/workspace";
import { notesRequest } from "./use-notes-workspace";
import type { ScheduleItem } from "@/lib/calendar/model";
export type PlannerTask = {
  id: string;
  title: string;
  contact_id: string;
  completed: boolean;
  due_at: string | null;
  source_note_id?: string;
  priority?: string;
};
export function RealtorPlanner({
  priorities,
  onPriorities,
  onTemplate,
  refreshKey,
}: {
  priorities: string[];
  onPriorities: (ids: string[]) => void;
  onTemplate: () => void;
  refreshKey?: number;
}) {
  const [view, setView] = useState<"day" | "week" | "month">("day"),
    [day, setDay] = useState(() => new Date().toLocaleDateString("en-CA")),
    [tasks, setTasks] = useState<PlannerTask[]>([]),
    [events, setEvents] = useState<ScheduleItem[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const range = useMemo(() => plannerRange(day, view), [day, view]);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    Promise.all([
      notesRequest<{ tasks: PlannerTask[]; error?: string }>(
        "/api/notes/planner",
      ),
      notesRequest<{
        agenda: ScheduleItem[];
        googleError?: string;
        complete?: boolean;
        limitations?: string[];
        warnings?: string[];
      }>(
        "/api/calendar/events?from=" +
          encodeURIComponent(range.start) +
          "&to=" +
          encodeURIComponent(range.end),
      ),
    ])
      .then(([t, e]) => {
        if (!live) return;
        if (t.error) throw Error();
        setTasks(t.tasks);
        setEvents(e.agenda ?? []);
        if (
          e.complete === false ||
          e.googleError ||
          e.limitations?.length ||
          e.warnings?.length
        )
          setError(
            "Some external calendar information could not be verified. Open Calendar for details.",
          );
      })
      .catch(() => {
        if (live) {
          setError(
            "Planner information is unavailable. Open Tasks or Calendar to retry.",
          );
          setTasks([]);
          setEvents([]);
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [range, refreshKey]);
  const visible = tasks
    .filter(
      (t) =>
        !t.completed &&
        t.due_at &&
        Date.parse(t.due_at) >= Date.parse(range.start) &&
        Date.parse(t.due_at) < Date.parse(range.end),
    )
    .sort((a, b) => {
      const ia = priorities.indexOf(a.id),
        ib = priorities.indexOf(b.id);
      return (
        (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) ||
        a.due_at!.localeCompare(b.due_at!)
      );
    });
  function move(id: string, direction: number) {
    const ids = visible.map((t) => t.id),
      i = ids.indexOf(id),
      j = i + direction;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    onPriorities(ids);
  }
  return (
    <section className="notes-planner">
      <div className="notes-panel-heading">
        <h3>AI Realtor Planner</h3>
        <button onClick={onTemplate}>Templates</button>
      </div>
      <p>
        Your real appointments and task deadlines. AI suggestions are reviewed
        in AI Assist.
      </p>
      <div className="notes-segment">
        {(["day", "week", "month"] as const).map((v) => (
          <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>
            {v === "day" ? "Daily" : v === "week" ? "Weekly" : "Monthly"}
          </button>
        ))}
      </div>
      <input
        aria-label="Planner date"
        type="date"
        value={day}
        onChange={(e) => {
          if (e.target.value) setDay(e.target.value);
        }}
      />
      {loading && <p role="status">Loading planner…</p>}
      {error && <p role="alert">{error}</p>}
      <h4>Top priorities &amp; deadlines</h4>
      {!loading && !visible.length && (
        <p>No open task deadlines in this view.</p>
      )}
      {visible.slice(0, 12).map((t, i) => (
        <div
          className="notes-planner-row"
          key={t.id}
          draggable
          onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData("text/plain");
            if (!visible.some((t) => t.id === id)) return;
            const ids = visible.map((t) => t.id).filter((v) => v !== id);
            ids.splice(i, 0, id);
            onPriorities(ids);
          }}
        >
          <Link href={`/dashboard/contacts/${t.contact_id}`}>
            {t.title}
            <small>{new Date(t.due_at!).toLocaleString()}</small>
          </Link>
          <button
            aria-label={`Move ${t.title} up`}
            disabled={i === 0}
            onClick={() => move(t.id, -1)}
          >
            ↑
          </button>
          <button
            aria-label={`Move ${t.title} down`}
            disabled={i === visible.length - 1}
            onClick={() => move(t.id, 1)}
          >
            ↓
          </button>
        </div>
      ))}
      <h4>Appointments</h4>
      {!loading && !events.filter((e) => !e.taskId).length && (
        <p>No appointments recorded in this view.</p>
      )}
      {events
        .filter((e) => !e.taskId)
        .slice(0, 10)
        .map((e) => (
          <Link
            className="notes-planner-event"
            key={e.id}
            href={`/dashboard/calendar?date=${e.starts_at.slice(0, 10)}`}
          >
            {e.title}
            <small>{new Date(e.starts_at).toLocaleString()}</small>
          </Link>
        ))}
      <div className="notes-actions">
        <Link href="/dashboard/tasks">Tasks →</Link>
        <Link href="/dashboard/calendar">Calendar →</Link>
      </div>
      <p>
        Use planner templates for business goals, follow-up checklists, and
        reflections. Prioritization changes this note’s display order only.
      </p>
    </section>
  );
}
