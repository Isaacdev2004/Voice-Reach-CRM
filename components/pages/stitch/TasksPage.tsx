"use client";

import Link from "next/link";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { recurrenceBadge, StandaloneTaskModal } from "@/components/crm/standalone-task-modal";
import { Icon } from "@/components/ui/icon";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type TaskRow = {
  id: string;
  title: string;
  due_at?: string | null;
  completed: boolean;
  notes?: string | null;
  recurrence?: string | null;
  contact_id: string;
  contacts?: { id: string; first_name: string; last_name?: string | null; phone?: string } | null;
};

export function TasksPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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

  const open = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);

  return (
    <div className="luxury-page mx-auto block w-full min-w-0 max-w-[1400px] space-y-6 p-4 sm:p-8">
      <header className="flex w-full flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">Tasks</p>
          <h1 className="font-serif text-[36px] font-semibold text-ink">Follow-ups & to-dos</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-text">
            Create daily, weekly, or monthly reminders with notes — synced to your calendar when
            Google is connected.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-rose-gold px-5 py-2.5 text-[14px] font-medium text-ivory hover:bg-rose-gold-deep"
        >
          <Icon name="add" className="text-[18px]" />
          New task
        </button>
      </header>

      {error ? (
        <p className="rounded-2xl bg-champagne px-4 py-3 text-[14px] text-taupe">{error}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <LuxuryCard padding="md">
          <p className="text-[13px] text-taupe">Open tasks</p>
          <p className="mt-1 font-serif text-[32px] font-semibold text-ink">
            {loading ? "…" : open.length}
          </p>
        </LuxuryCard>
        <LuxuryCard padding="md">
          <p className="text-[13px] text-taupe">Completed</p>
          <p className="mt-1 font-serif text-[32px] font-semibold text-ink">
            {loading ? "…" : done.length}
          </p>
        </LuxuryCard>
        <Link href="/dashboard/calendar" className="block">
          <LuxuryCard padding="md" className="h-full transition-shadow hover:shadow-nav">
            <p className="text-[13px] text-taupe">View calendar</p>
            <p className="mt-2 text-[14px] font-medium text-rose-gold-deep">Open agenda →</p>
          </LuxuryCard>
        </Link>
      </div>

      <LuxuryCard padding="none" className="w-full min-w-0 overflow-hidden">
        <div className="border-b border-outline-variant/15 px-6 py-4">
          <h2 className="font-serif text-[22px] font-semibold text-ink">Open tasks</h2>
        </div>
        {loading ? (
          <p className="p-8 text-center text-taupe">Loading tasks…</p>
        ) : open.length === 0 ? (
          <div className="block w-full px-6 py-10 sm:px-10 sm:py-12">
            <h3 className="font-serif text-[22px] font-semibold text-ink">No open tasks</h3>
            <p className="mt-4 max-w-none text-[15px] leading-relaxed text-slate-text">
              Tap <strong>Quick Create (+)</strong> at the top and choose <strong>New task</strong>.
              You can set a due date, add notes, and pick daily, weekly, or monthly repeats.
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
        ) : (
          <ul className="divide-y divide-outline-variant/15">
            {open.map((task) => {
              const c = task.contacts;
              const name = c ? `${c.first_name} ${c.last_name ?? ""}`.trim() : "Contact";
              const repeat = recurrenceBadge(task.recurrence);

              return (
                <li key={task.id} className="flex items-start gap-4 px-6 py-4 hover:bg-cream/40">
                  <button
                    type="button"
                    onClick={() => void toggleComplete(task)}
                    className="mt-0.5 rounded-full p-2 hover:bg-champagne"
                    aria-label="Mark complete"
                  >
                    <Icon name="radio_button_unchecked" className="text-[22px] text-taupe" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink">{task.title}</p>
                      {repeat ? (
                        <span className="rounded-full bg-champagne px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-taupe">
                          {repeat}
                        </span>
                      ) : null}
                    </div>
                    {task.due_at ? (
                      <p className="text-[13px] text-slate-text">
                        Due {new Date(task.due_at).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-[13px] text-taupe">No due date</p>
                    )}
                    {task.notes ? (
                      <p className="mt-1 text-[13px] text-slate-text line-clamp-2">{task.notes}</p>
                    ) : null}
                  </div>
                  <Link
                    href={`/dashboard/contacts/${task.contact_id}`}
                    className="shrink-0 whitespace-nowrap text-[13px] font-medium text-rose-gold-deep hover:underline"
                  >
                    {name} →
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </LuxuryCard>

      {done.length > 0 ? (
        <LuxuryCard padding="none" className="w-full overflow-hidden">
          <div className="border-b border-outline-variant/15 px-6 py-4">
            <h2 className="font-serif text-[20px] font-semibold text-ink">Completed</h2>
          </div>
          <ul className="divide-y divide-outline-variant/15">
            {done.slice(0, 10).map((task) => (
              <li key={task.id} className="flex items-center gap-4 px-6 py-3 opacity-70">
                <Icon name="check_circle" className="text-[20px] text-emerald-muted" />
                <p className="flex-1 text-[14px] text-ink line-through">{task.title}</p>
              </li>
            ))}
          </ul>
        </LuxuryCard>
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
