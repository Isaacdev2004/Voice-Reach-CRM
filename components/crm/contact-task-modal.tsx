"use client";

import {
  Modal,
  ModalField,
  ModalFooterActions,
  modalInputClass,
} from "@/components/crm/modal";
import type { Recurrence } from "@/lib/calendar/google";
import type { ContactTask } from "@/lib/hooks/use-contact-tasks";
import { useEffect, useState } from "react";

type ContactTaskModalProps = {
  open: boolean;
  onClose: () => void;
  task?: ContactTask | null;
  onSave: (input: {
    title: string;
    dueAt?: string | null;
    notes?: string | null;
    recurrence?: Recurrence;
    addToCalendar?: boolean;
  }) => Promise<void>;
  saving?: boolean;
  showCalendarOption?: boolean;
};

function toLocalDatetimeValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function localDatetimeToIso(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

export function ContactTaskModal({
  open,
  onClose,
  task,
  onSave,
  saving,
  showCalendarOption,
}: ContactTaskModalProps) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [addToCalendar, setAddToCalendar] = useState(true);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDueAt(toLocalDatetimeValue(task?.due_at));
    setNotes(task?.notes ?? "");
    setRecurrence((task as { recurrence?: Recurrence })?.recurrence ?? "none");
    setAddToCalendar(!task);
  }, [open, task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onSave({
      title: title.trim(),
      dueAt: localDatetimeToIso(dueAt),
      notes: notes.trim() || null,
      recurrence,
      addToCalendar: showCalendarOption && addToCalendar && Boolean(dueAt),
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? "Edit task" : "New task"}
      description="Set a follow-up or reminder for this contact."
      icon="task_alt"
      size="md"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel={saving ? "Saving…" : task ? "Save changes" : "Add task"}
          onPrimary={() => {
            const form = document.getElementById("contact-task-form") as HTMLFormElement | null;
            form?.requestSubmit();
          }}
          primaryDisabled={saving || !title.trim()}
          primaryLoading={saving}
        />
      }
    >
      <form id="contact-task-form" onSubmit={handleSubmit} className="space-y-4">
        <ModalField label="Task" required>
          <input
            className={modalInputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Follow up on home search criteria"
          />
        </ModalField>
        <ModalField label="Due date & time">
          <input
            type="datetime-local"
            className={modalInputClass}
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </ModalField>
        <ModalField label="Notes">
          <textarea
            className={modalInputClass}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional context for this reminder"
          />
        </ModalField>
        <ModalField label="Repeat">
          <select
            className={modalInputClass}
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as Recurrence)}
          >
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </ModalField>
        {showCalendarOption && dueAt ? (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-cream/60 px-4 py-3 text-[14px]">
            <input
              type="checkbox"
              checked={addToCalendar}
              onChange={(e) => setAddToCalendar(e.target.checked)}
              className="rounded border-outline-variant accent-rose-gold-deep"
            />
            Add to Google Calendar (when connected)
          </label>
        ) : null}
      </form>
    </Modal>
  );
}
