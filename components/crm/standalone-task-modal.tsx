"use client";

import {
  Modal,
  ModalField,
  ModalFooterActions,
  modalInputClass,
} from "@/components/crm/modal";
import type { Recurrence } from "@/lib/calendar/google";
import { useEffect, useState } from "react";

type ContactOption = {
  id: string;
  first_name: string;
  last_name?: string | null;
};

type StandaloneTaskModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

function toLocalDatetimeValue(d: Date): string {
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function StandaloneTaskModal({ open, onClose, onSaved }: StandaloneTaskModalProps) {
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [contactId, setContactId] = useState<string>("");
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [addToCalendar, setAddToCalendar] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setDueAt(toLocalDatetimeValue(new Date()));
    setNotes("");
    setRecurrence("none");
    setContactId("");
    setAddToCalendar(true);
    setError(null);

    void fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => {
        const list = (data.contacts ?? []) as ContactOption[];
        setContacts(list);
        if (list.length > 0) setContactId(list[0].id);
      })
      .catch(() => setContacts([]));
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          notes: notes.trim() || null,
          recurrence,
          contactId: contactId || undefined,
          addToCalendar: addToCalendar && Boolean(dueAt),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create task");

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New task"
      description="Add a follow-up with optional daily, weekly, or monthly reminders."
      icon="task_alt"
      size="md"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel={saving ? "Saving…" : "Add task"}
          onPrimary={() => {
            const form = document.getElementById("standalone-task-form") as HTMLFormElement | null;
            form?.requestSubmit();
          }}
          primaryDisabled={saving || !title.trim()}
          primaryLoading={saving}
        />
      }
    >
      <form id="standalone-task-form" onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <p className="rounded-xl border border-error/20 bg-error/5 px-3 py-2 text-[13px] text-error">
            {error}
          </p>
        ) : null}

        <ModalField label="Task" required>
          <input
            className={modalInputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Follow up on listing, send market update…"
          />
        </ModalField>

        <ModalField label="Contact">
          <select
            className={modalInputClass}
            value={contactId}
            onChange={(e) => setContactId(e.target.value)}
          >
            <option value="">My tasks (no contact)</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {`${c.first_name} ${c.last_name ?? ""}`.trim()}
              </option>
            ))}
          </select>
        </ModalField>

        <ModalField label="Due date & time">
          <input
            type="datetime-local"
            className={modalInputClass}
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </ModalField>

        <ModalField label="Repeat">
          <select
            className={modalInputClass}
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as Recurrence)}
          >
            {RECURRENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </ModalField>

        <ModalField label="Notes">
          <textarea
            className={modalInputClass}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Context, talking points, or reminders"
          />
        </ModalField>

        {dueAt ? (
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

function recurrenceBadge(recurrence: string | null | undefined): string | null {
  switch (recurrence) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    default:
      return null;
  }
}

export { recurrenceBadge };
