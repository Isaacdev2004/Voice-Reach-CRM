"use client";

import { ContactTaskModal } from "@/components/crm/contact-task-modal";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { useContactTasks, type ContactTask } from "@/lib/hooks/use-contact-tasks";
import type { RelationshipTask } from "@/lib/crm/types";
import { useState } from "react";

type ContactTasksPanelProps = {
  contactId: string;
  demoTasks?: RelationshipTask[];
  isDemo?: boolean;
};

function formatDueDate(iso: string | null): string {
  if (!iso) return "No due date";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ContactTasksPanel({ contactId, demoTasks = [], isDemo }: ContactTasksPanelProps) {
  const { tasks, loading, error, enabled, createTask, updateTask, deleteTask } =
    useContactTasks(contactId);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ContactTask | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const displayTasks = enabled
    ? tasks
    : demoTasks.map((t) => ({
        id: t.id,
        title: t.title,
        due_at: null as string | null,
        completed: t.completed,
        notes: null as string | null,
        dueDateLabel: `Due ${t.dueDate}`,
      }));

  const handleSave = async (input: {
    title: string;
    dueAt?: string | null;
    notes?: string | null;
    addToCalendar?: boolean;
  }) => {
    setSaving(true);
    setActionError(null);
    try {
      if (editing) {
        await updateTask(editing.id, input);
      } else {
        await createTask(input);
      }
      setModalOpen(false);
      setEditing(null);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not save task");
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = async (task: ContactTask) => {
    try {
      await updateTask(task.id, { completed: !task.completed });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not update task");
    }
  };

  return (
    <>
      <LuxuryCard padding="lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-[20px] font-semibold text-ink">Tasks</h2>
          {enabled ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              className="text-[13px] font-medium text-rose-gold-deep hover:underline"
            >
              + New task
            </button>
          ) : null}
        </div>

        {isDemo ? (
          <p className="mb-3 text-[12px] text-taupe">
            Demo profile — open a real imported contact to add tasks.
          </p>
        ) : null}

        {loading ? <p className="text-[13px] text-taupe">Loading tasks…</p> : null}
        {error ? (
          <p className="mb-3 rounded-xl bg-champagne px-3 py-2 text-[13px] text-taupe">{error}</p>
        ) : null}
        {actionError ? (
          <p className="mb-3 rounded-xl border border-error/20 bg-error/5 px-3 py-2 text-[13px] text-error">
            {actionError}
          </p>
        ) : null}

        <ul className="space-y-3">
          {displayTasks.length === 0 && !loading ? (
            <li className="py-4 text-center text-[13px] text-taupe">No tasks yet</li>
          ) : null}
          {enabled
            ? tasks.map((task) => (
                <li key={task.id} className="group flex gap-3 rounded-xl px-1 py-1 hover:bg-cream/50">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => void toggleComplete(task)}
                    className="mt-1 rounded border-outline-variant text-rose-gold"
                  />
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(task);
                        setModalOpen(true);
                      }}
                      className={cn(
                        "text-left text-[14px] font-medium hover:text-rose-gold-deep",
                        task.completed ? "text-taupe line-through" : "text-ink",
                      )}
                    >
                      {task.title}
                    </button>
                    <p className="text-[12px] text-taupe">{formatDueDate(task.due_at)}</p>
                    {task.notes ? (
                      <p className="mt-1 text-[12px] text-slate-text">{task.notes}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteTask(task.id)}
                    className="opacity-0 transition-opacity group-hover:opacity-100 text-taupe hover:text-error"
                    aria-label="Delete task"
                  >
                    <Icon name="delete" className="text-[18px]" />
                  </button>
                </li>
              ))
            : demoTasks.map((task) => (
                <li key={task.id} className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    readOnly
                    className="mt-1 rounded border-outline-variant text-rose-gold"
                  />
                  <div>
                    <p
                      className={
                        task.completed ? "text-taupe line-through" : "text-[14px] font-medium text-ink"
                      }
                    >
                      {task.title}
                    </p>
                    <p className="text-[12px] text-taupe">Due {task.dueDate}</p>
                  </div>
                </li>
              ))}
        </ul>
      </LuxuryCard>

      <ContactTaskModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        task={editing}
        onSave={handleSave}
        saving={saving}
        showCalendarOption={!editing}
      />
    </>
  );
}
