"use client";

import {
  Modal,
  ModalField,
  ModalFooterActions,
  modalInputClass,
} from "@/components/crm/modal";
import type { Recurrence } from "@/lib/calendar/google";
import { useEffect, useState } from "react";

type AddCalendarEventModalProps = {
  open: boolean;
  onClose: () => void;
  defaultDate?: Date | null;
  onCreated: () => void;
  connected: boolean;
};

function toLocalDateValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toLocalTimeValue(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function AddCalendarEventModal({
  open,
  onClose,
  defaultDate,
  onCreated,
  connected,
}: AddCalendarEventModalProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("60");
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const base = defaultDate ?? new Date();
    setTitle("");
    setDate(toLocalDateValue(base));
    setTime(toLocalTimeValue(base));
    setDuration("60");
    setNotes("");
    setRecurrence("none");
    setError(null);
  }, [open, defaultDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    setSaving(true);
    setError(null);
    try {
      const startsAt = new Date(`${date}T${time}`);
      const endsAt = new Date(startsAt.getTime() + Number(duration) * 60_000);

      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          description: notes.trim() || undefined,
          recurrence,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create event");

      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create event");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add event"
      description={
        connected
          ? "Creates in VoiceReach and syncs to your Google Calendar."
          : "Saved in VoiceReach. Connect Google Calendar in Settings to sync."
      }
      icon="event"
      size="md"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel={saving ? "Saving…" : "Add event"}
          onPrimary={() => {
            const form = document.getElementById("add-calendar-event-form") as HTMLFormElement | null;
            form?.requestSubmit();
          }}
          primaryDisabled={saving || !title.trim() || !date}
          primaryLoading={saving}
        />
      }
    >
      <form id="add-calendar-event-form" onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <p className="rounded-xl border border-error/20 bg-error/5 px-3 py-2 text-[13px] text-error">
            {error}
          </p>
        ) : null}

        <ModalField label="Title" required>
          <input
            className={modalInputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Client showing, team meeting…"
          />
        </ModalField>

        <div className="grid gap-4 sm:grid-cols-2">
          <ModalField label="Date" required>
            <input
              type="date"
              className={modalInputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </ModalField>
          <ModalField label="Time">
            <input
              type="time"
              className={modalInputClass}
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </ModalField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <ModalField label="Duration (minutes)">
            <select
              className={modalInputClass}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            >
              <option value="30">30 min</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
            </select>
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
        </div>

        <ModalField label="Notes">
          <textarea
            className={modalInputClass}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional details for this event"
          />
        </ModalField>
      </form>
    </Modal>
  );
}
