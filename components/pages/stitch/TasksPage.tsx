"use client";

import Link from "next/link";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { useEffect, useState } from "react";

type TaskRow = {
  id: string;
  title: string;
  due_at?: string | null;
  completed: boolean;
  contact_id: string;
  contacts?: { id: string; first_name: string; last_name?: string | null; phone?: string } | null;
};

export function TasksPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [error, setError] = useState<string | null>(null);

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
    <div className="luxury-page p-8 max-w-[1400px] w-full mx-auto space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">Tasks</p>
        <h1 className="font-serif text-[36px] font-semibold text-ink">Follow-ups & to-dos</h1>
        <p className="mt-1 text-[15px] text-slate-text">
          Tasks across all contacts. Add more from any relationship profile.
        </p>
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
            <p className="text-[13px] text-taupe">View agenda</p>
            <p className="mt-2 text-[14px] font-medium text-rose-gold-deep">Open calendar →</p>
          </LuxuryCard>
        </Link>
      </div>

      <LuxuryCard padding="none" className="overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-taupe">Loading tasks…</p>
        ) : open.length === 0 ? (
          <p className="p-8 text-center text-taupe">No open tasks — you&apos;re caught up.</p>
        ) : (
          <ul className="divide-y divide-outline-variant/15">
            {open.map((task) => {
              const c = task.contacts;
              const name = c ? `${c.first_name} ${c.last_name ?? ""}`.trim() : "Contact";
              return (
                <li key={task.id} className="flex items-center gap-4 px-6 py-4 hover:bg-cream/40">
                  <button
                    type="button"
                    onClick={() => void toggleComplete(task)}
                    className="rounded-full p-2 hover:bg-champagne"
                    aria-label="Mark complete"
                  >
                    <Icon name="radio_button_unchecked" className="text-[22px] text-taupe" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{task.title}</p>
                    {task.due_at ? (
                      <p className="text-[13px] text-slate-text">
                        Due {new Date(task.due_at).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  <Link
                    href={`/dashboard/contacts/${task.contact_id}`}
                    className="text-[13px] font-medium text-rose-gold-deep hover:underline whitespace-nowrap"
                  >
                    {name} →
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </LuxuryCard>
    </div>
  );
}
