"use client";

import Link from "next/link";
import { DASHBOARD_PAGE_BODY } from "@/lib/dashboard/layout";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { StandaloneTaskModal } from "@/components/crm/standalone-task-modal";
import { TaskGridCards, TaskListTable, type TaskTableRow } from "@/components/tasks/task-list-table";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { isDueWithinDays, isOverdue, startOfDay } from "@/lib/tasks/display-meta";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type TaskRow = TaskTableRow & {
  recurrence?: string | null;
  updated_at?: string;
};

type ViewMode = "list" | "grid";

export function TasksPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showCompleted, setShowCompleted] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load tasks");
      setTasks(data.tasks ?? []);
      setError(data.error ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tasks");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (searchParams.get("new") === "task") setModalOpen(true);
  }, [searchParams]);

  const toggleComplete = async (task: TaskRow) => {
    const res = await fetch(`/api/contacts/${task.contact_id}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    if (res.ok) void refresh();
  };

  const open = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);
  const done = useMemo(() => tasks.filter((t) => t.completed), [tasks]);

  const stats = useMemo(() => {
    const now = startOfDay();
    const dueThisWeek = open.filter((t) => isDueWithinDays(t.due_at, 7, now)).length;
    const overdue = open.filter((t) => isOverdue(t.due_at, t.completed)).length;
    return {
      open: open.length,
      dueThisWeek,
      overdue,
      completed: done.length,
    };
  }, [open, done]);

  return (
    <div className={DASHBOARD_PAGE_BODY}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-[28px] font-semibold text-ink sm:text-[32px]">
            Follow-ups &amp; to-dos
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-text">
            Stay on top of follow-ups, reminders, and client touchpoints — due dates can sync to your
            calendar when you create a task.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/calendar"
            className="inline-flex items-center gap-2 rounded-full border border-outline-variant/25 bg-ivory px-5 py-2.5 text-[14px] font-medium text-ink hover:bg-champagne"
          >
            <Icon name="calendar_today" className="text-[18px] text-rose-gold-deep" />
            View calendar
          </Link>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-rose-gold px-5 py-2.5 text-[14px] font-medium text-ivory hover:opacity-90"
          >
            <Icon name="add" className="text-[18px]" />
            New task
          </button>
        </div>
      </header>

      {error ? (
        <p className="rounded-2xl bg-champagne px-4 py-3 text-[14px] text-taupe">{error}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <LuxuryCard padding="md">
          <p className="text-[13px] text-taupe">Open tasks</p>
          <p className="mt-1 font-serif text-[32px] font-semibold text-ink">
            {loading ? "…" : stats.open}
          </p>
          <p className="mt-1 text-[12px] text-slate-text">
            {stats.dueThisWeek > 0
              ? `${stats.dueThisWeek} due this week`
              : "Nothing due this week"}
          </p>
        </LuxuryCard>
        <LuxuryCard padding="md">
          <p className="text-[13px] text-taupe">Completed</p>
          <p className="mt-1 font-serif text-[32px] font-semibold text-ink">
            {loading ? "…" : stats.completed}
          </p>
          <p className="mt-1 text-[12px] text-slate-text">This month</p>
        </LuxuryCard>
        <LuxuryCard padding="md">
          <p className="text-[13px] text-taupe">Due this week</p>
          <p className="mt-1 font-serif text-[32px] font-semibold text-ink">
            {loading ? "…" : stats.dueThisWeek}
          </p>
          <p className="mt-1 text-[12px] text-slate-text">Next 7 days</p>
        </LuxuryCard>
        <LuxuryCard padding="md">
          <p className="text-[13px] text-taupe">Overdue</p>
          <p
            className={cn(
              "mt-1 font-serif text-[32px] font-semibold",
              stats.overdue > 0 ? "text-error" : "text-ink",
            )}
          >
            {loading ? "…" : stats.overdue}
          </p>
          <p className={cn("mt-1 text-[12px]", stats.overdue > 0 ? "text-error/80" : "text-slate-text")}>
            {stats.overdue > 0 ? "Needs attention" : "You're caught up"}
          </p>
        </LuxuryCard>
      </div>

      <LuxuryCard padding="none" className="w-full min-w-0 overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-outline-variant/15 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-serif text-[22px] font-semibold text-ink">
              Open tasks{" "}
              <span className="text-[16px] font-normal text-taupe">
                {loading ? "" : `${open.length} tasks`}
              </span>
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {["All tasks", "Due date", "Priority", "Assignee"].map((label, i) => (
              <button
                key={label}
                type="button"
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-medium",
                  i === 0
                    ? "border-rose-gold/30 bg-rose-gold/10 text-rose-gold-deep"
                    : "border-outline-variant/20 text-taupe",
                )}
              >
                {label}
                {i > 0 ? <Icon name="expand_more" className="text-[16px]" /> : null}
              </button>
            ))}
            <div className="ml-auto flex rounded-full border border-outline-variant/20 p-0.5 lg:ml-2">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "rounded-full p-1.5",
                  viewMode === "list" ? "bg-champagne text-ink" : "text-taupe",
                )}
                aria-label="List view"
              >
                <Icon name="view_list" className="text-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "rounded-full p-1.5",
                  viewMode === "grid" ? "bg-champagne text-ink" : "text-taupe",
                )}
                aria-label="Grid view"
              >
                <Icon name="grid_view" className="text-[18px]" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="p-8 text-center text-taupe">Loading tasks…</p>
        ) : open.length === 0 ? (
          <div className="block w-full px-6 py-10 sm:px-10 sm:py-12">
            <h3 className="font-serif text-[22px] font-semibold text-ink">No open tasks</h3>
            <p className="mt-4 max-w-none text-[15px] leading-relaxed text-slate-text">
              Tap <strong>New task</strong> to add a follow-up, set a due date, and optionally sync
              it to your calendar.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-rose-gold px-5 py-2.5 text-[14px] font-medium text-ivory"
            >
              <Icon name="add" className="text-[18px]" />
              Create a task
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <TaskGridCards tasks={open} onToggleComplete={(t) => void toggleComplete(t as TaskRow)} />
        ) : (
          <TaskListTable tasks={open} onToggleComplete={(t) => void toggleComplete(t as TaskRow)} />
        )}
      </LuxuryCard>

      {done.length > 0 && showCompleted ? (
        <LuxuryCard padding="none" className="w-full overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/15 px-4 py-4 sm:px-6">
            <h2 className="font-serif text-[20px] font-semibold text-ink">
              Completed{" "}
              <span className="text-[15px] font-normal text-taupe">{done.length} tasks</span>
            </h2>
            <button
              type="button"
              onClick={() => setShowCompleted(false)}
              className="text-[13px] font-medium text-rose-gold-deep hover:underline"
            >
              Hide completed
            </button>
          </div>
          <TaskListTable tasks={done.slice(0, 20)} completed />
        </LuxuryCard>
      ) : done.length > 0 && !showCompleted ? (
        <button
          type="button"
          onClick={() => setShowCompleted(true)}
          className="text-[13px] font-medium text-rose-gold-deep hover:underline"
        >
          Show completed ({done.length})
        </button>
      ) : null}

      <StandaloneTaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => void refresh()}
      />

      {open.length > 0 ? (
        <div className="fixed bottom-20 right-4 z-30 sm:hidden">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-rose-gold px-5 py-3 text-[14px] font-medium text-ivory shadow-nav"
          >
            <Icon name="add" className="text-[20px]" />
            New task
          </button>
        </div>
      ) : null}
    </div>
  );
}
