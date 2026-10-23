"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import {
  assigneeLabel,
  formatTaskDue,
  priorityClass,
  priorityIcon,
  priorityLabel,
  taskCategory,
  taskPriority,
  type TaskPriority,
} from "@/lib/tasks/display-meta";

export type TaskTableRow = {
  id: string;
  title: string;
  due_at?: string | null;
  completed: boolean;
  completed_at?: string | null;
  notes?: string | null;
  contact_id: string;
  source_note_id?: string | null;
  priority?: string | null;
  contacts?: {
    id: string;
    first_name: string;
    last_name?: string | null;
    phone?: string;
    type?: string | null;
  } | null;
};

type TaskListTableProps = {
  tasks: TaskTableRow[];
  completed?: boolean;
  onToggleComplete?: (task: TaskTableRow) => void;
};

function PriorityCell({ priority }: { priority: TaskPriority }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[12px] font-medium", priorityClass(priority))}>
      <Icon name={priorityIcon(priority)} className="text-[16px]" />
      {priorityLabel(priority)}
    </span>
  );
}

export function TaskListTable({ tasks, completed = false, onToggleComplete }: TaskListTableProps) {
  if (tasks.length === 0) return null;

  return (
    <>
      <ul className="divide-y divide-outline-variant/10 md:hidden">
        {tasks.map((task) => {
          const cat = taskCategory(task.title, task.notes);
          const priority = taskPriority(task);
          const assignee = assigneeLabel(task.contacts);
          const sub = task.notes?.trim() || "Stay focused and follow through on this step.";

          return (
            <li key={task.id} className="px-4 py-3 sm:px-5">
              <div className="flex items-start gap-3">
                {!completed && onToggleComplete ? (
                  <button
                    type="button"
                    onClick={() => onToggleComplete(task)}
                    className="mt-0.5 shrink-0 rounded-full p-1 hover:bg-champagne"
                    aria-label="Mark complete"
                  >
                    <Icon name="radio_button_unchecked" className="text-[20px] text-taupe" />
                  </button>
                ) : (
                  <Icon name="check_circle" className="mt-0.5 shrink-0 text-[20px] text-emerald-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        cat.className,
                      )}
                    >
                      {cat.label}
                    </span>
                    <PriorityCell priority={priority} />
                  </div>
                  <p
                    className={cn(
                      "mt-1.5 font-medium text-ink",
                      completed && "text-slate-text line-through",
                    )}
                  >
                    {task.title}
                  </p>
                  {task.source_note_id ? <Link href={`/dashboard/notes?note=${task.source_note_id}`} className="text-[11px] text-rose-gold-deep hover:underline">Source note →</Link> : null}
                  {!completed ? (
                    <p className="mt-0.5 line-clamp-2 text-[12px] text-slate-text">{sub}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-taupe">
                    <span>
                      {completed
                        ? formatTaskDue(task.completed_at ?? task.due_at)
                        : formatTaskDue(task.due_at)}
                    </span>
                    <Link
                      href={`/dashboard/contacts/${task.contact_id}`}
                      className="font-medium text-rose-gold-deep hover:underline"
                    >
                      {assignee}
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full min-w-[880px] border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-outline-variant/15 text-[11px] font-semibold uppercase tracking-wider text-taupe">
            <th className="pb-3 pr-4 pl-6 font-semibold">Task</th>
            <th className="pb-3 pr-4 font-semibold">Tag</th>
            <th className="pb-3 pr-4 font-semibold">Due date</th>
            <th className="pb-3 pr-4 font-semibold">Priority</th>
            <th className="pb-3 pr-6 font-semibold">Assignee</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const cat = taskCategory(task.title, task.notes);
            const priority = taskPriority(task);
            const assignee = assigneeLabel(task.contacts);
            const sub = task.notes?.trim() || "Stay focused and follow through on this step.";

            return (
              <tr
                key={task.id}
                className="border-b border-outline-variant/10 last:border-0 hover:bg-cream/40"
              >
                <td className="py-4 pl-6 pr-4">
                  <div className="flex items-start gap-3">
                    {!completed && onToggleComplete ? (
                      <button
                        type="button"
                        onClick={() => onToggleComplete(task)}
                        className="mt-0.5 shrink-0 rounded-full p-1 hover:bg-champagne"
                        aria-label="Mark complete"
                      >
                        <Icon name="radio_button_unchecked" className="text-[20px] text-taupe" />
                      </button>
                    ) : (
                      <Icon name="check_circle" className="mt-0.5 shrink-0 text-[20px] text-emerald-muted" />
                    )}
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "font-medium text-ink",
                          completed && "text-slate-text line-through",
                        )}
                      >
                        {task.title}
                      </p>
                      {task.source_note_id ? <Link href={`/dashboard/notes?note=${task.source_note_id}`} className="text-[11px] text-rose-gold-deep hover:underline">Source note →</Link> : null}
                      {!completed ? (
                        <p className="mt-0.5 line-clamp-1 text-[12px] text-slate-text">{sub}</p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="py-4 pr-4">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      cat.className,
                    )}
                  >
                    {cat.label}
                  </span>
                </td>
                <td className="py-4 pr-4 text-slate-text">
                  {completed
                    ? formatTaskDue(task.completed_at ?? task.due_at)
                    : formatTaskDue(task.due_at)}
                </td>
                <td className="py-4 pr-4">
                  <PriorityCell priority={priority} />
                </td>
                <td className="py-4 pr-6">
                  <Link
                    href={`/dashboard/contacts/${task.contact_id}`}
                    className="font-medium text-rose-gold-deep hover:underline"
                  >
                    {assignee}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}

export function TaskGridCards({
  tasks,
  onToggleComplete,
}: {
  tasks: TaskTableRow[];
  onToggleComplete?: (task: TaskTableRow) => void;
}) {
  return (
    <ul className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {tasks.map((task) => {
        const cat = taskCategory(task.title, task.notes);
        const priority = taskPriority(task);
        return (
          <li
            key={task.id}
            className="rounded-2xl border border-outline-variant/15 bg-ivory p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", cat.className)}>
                {cat.label}
              </span>
              {onToggleComplete ? (
                <button
                  type="button"
                  onClick={() => onToggleComplete(task)}
                  aria-label="Mark complete"
                  className="rounded-full p-1 hover:bg-champagne"
                >
                  <Icon name="radio_button_unchecked" className="text-[20px] text-taupe" />
                </button>
              ) : null}
            </div>
            <p className="mt-2 font-medium text-ink">{task.title}</p>
            {task.source_note_id ? <Link href={`/dashboard/notes?note=${task.source_note_id}`} className="text-[11px] text-rose-gold-deep hover:underline">Source note →</Link> : null}
            <p className="mt-2 text-[12px] text-taupe">{formatTaskDue(task.due_at)}</p>
            <div className="mt-3 flex items-center justify-between text-[12px]">
              <PriorityCell priority={priority} />
              <span className="text-rose-gold-deep">{assigneeLabel(task.contacts)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
