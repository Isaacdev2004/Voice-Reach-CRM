"use client";
import { useState } from "react";
import { Modal } from "@/components/crm/modal";
import {
  CalendarPreferencesSchema,
  DEFAULT_CALENDAR_PREFERENCES,
  type CalendarPreferences,
} from "@/lib/calendar/preferences";
export function CalendarPreferencesDialog({
  value,
  onSave,
  onClose,
}: {
  value: CalendarPreferences;
  onSave: (p: CalendarPreferences) => Promise<boolean>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const update = <K extends keyof CalendarPreferences>(
    key: K,
    v: CalendarPreferences[K],
  ) => setDraft((p) => ({ ...p, [key]: v }));
  return (
    <Modal
      open
      onClose={onClose}
      title="Calendar preferences"
      description="Saved to your subscriber account across devices. Changes are saved only when you choose Save."
    >
      <form
        className="calendar-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const parsed = CalendarPreferencesSchema.safeParse(draft);
          if (!parsed.success) {
            setError(
              "Check the timezone, working hours, and numeric settings.",
            );
            return;
          }
          setBusy(true);
          if (await onSave(parsed.data)) onClose();
          else
            setError(
              "Could not save. Reload if these preferences changed on another device.",
            );
          setBusy(false);
        }}
      >
        <label>
          Timezone
          <input
            value={draft.timezone}
            onChange={(e) => update("timezone", e.target.value)}
            placeholder="America/New_York"
          />
        </label>
        <label>
          Default view
          <select
            value={draft.view}
            onChange={(e) =>
              update("view", e.target.value as CalendarPreferences["view"])
            }
          >
            {["week", "day", "month", "agenda"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <div className="calendar-form-pair">
          <label>
            Working hours start
            <input
              type="time"
              value={draft.workStart}
              onChange={(e) => update("workStart", e.target.value)}
            />
          </label>
          <label>
            Working hours end
            <input
              type="time"
              value={draft.workEnd}
              onChange={(e) => update("workEnd", e.target.value)}
            />
          </label>
        </div>
        <fieldset>
          <legend>Working days</legend>
          <div className="flex flex-wrap gap-3">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
              <label key={d} className="calendar-check">
                <input
                  type="checkbox"
                  checked={draft.workDays.includes(i)}
                  onChange={(e) =>
                    update(
                      "workDays",
                      e.target.checked
                        ? [...draft.workDays, i]
                        : draft.workDays.filter((v) => v !== i),
                    )
                  }
                />
                {d}
              </label>
            ))}
          </div>
        </fieldset>
        {(
          [
            ["duration", "Default duration (minutes)"],
            ["bufferBefore", "Buffer before (minutes)"],
            ["bufferAfter", "Buffer after (minutes)"],
            ["travelMinutes", "Manual travel allowance (minutes)"],
            ["noticeMinutes", "Minimum booking notice (minutes)"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              type="number"
              min={key === "duration" ? 15 : 0}
              max={
                key === "duration" ? 480 : key === "noticeMinutes" ? 43200 : 240
              }
              value={draft[key]}
              onChange={(e) => update(key, +e.target.value)}
            />
          </label>
        ))}
        <small>
          Travel allowance is manually configured; no driving-time estimates are
          calculated.
        </small>
        {(
          [
            ["hour24", "24-hour time"],
            ["mondayStart", "Start weeks on Monday"],
            ["leftOpen", "Show desktop calendars panel"],
            ["rightOpen", "Show desktop details panel"],
            ["mobileLeftOpen", "Open calendars drawer on mobile return"],
            ["mobileRightOpen", "Open details drawer on mobile return"],
            [
              "inAppReminders",
              "Enable in-app due reminders while Calendar is open",
            ],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="calendar-check">
            <input
              type="checkbox"
              checked={draft[key]}
              onChange={(e) => update(key, e.target.checked)}
            />
            {label}
          </label>
        ))}
        {error ? <p role="alert">{error}</p> : null}
        <button disabled={busy}>{busy ? "Saving…" : "Save preferences"}</button>
        <button
          type="button"
          className="calendar-secondary"
          onClick={() => setDraft(DEFAULT_CALENDAR_PREFERENCES)}
        >
          Reset to defaults (save to apply)
        </button>
      </form>
    </Modal>
  );
}
