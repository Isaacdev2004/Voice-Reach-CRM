"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/crm/modal";
import {
  meta,
  TaskEditSchema,
  type TaskRecord,
  type TaskContact,
  type TaskMember,
  type TaskEdit,
} from "@/lib/tasks/workspace-model";
import { zonedParts, wallTimeToInstant } from "@/lib/calendar/time";
type Seed = {
  contactId?: string;
  propertyId?: string;
  noteId?: string;
  campaignId?: string;
  eventId?: string;
  title?: string;
  notes?: string;
  dueAt?: string | null;
  priority?: "high" | "medium" | "low" | "unspecified";
};
export function TaskEditor({
  open,
  onClose,
  onSave,
  task,
  seed,
  contacts,
  members,
  tasks,
  timezone,
  advanced,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (v: TaskEdit) => Promise<void>;
  task?: TaskRecord;
  seed?: Seed;
  contacts: TaskContact[];
  members: TaskMember[];
  tasks: TaskRecord[];
  timezone: string;
  advanced: boolean;
}) {
  const [value, setValue] = useState<TaskEdit | null>(null),
    [local, setLocal] = useState(""),
    [reminder, setReminder] = useState(""),
    [fold, setFold] = useState<"reject" | "earlier" | "later">("reject"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    const m = task
      ? meta(task)
      : meta({
          workspace: {},
          id: "",
          owner_id: "",
          contact_id: "",
          title: "",
          due_at: null,
          completed: false,
        });
    m.timezone = timezone;
    if (seed?.propertyId) m.propertyContactId = seed.propertyId;
    if (seed?.campaignId) m.sourceCampaignId = seed.campaignId;
    if (seed?.eventId) m.sourceEventId = seed.eventId;
    const prepared = TaskEditSchema.parse({
      id: task?.id ?? crypto.randomUUID(),
      expectedUpdatedAt: task?.updated_at ?? null,
      title: task?.title ?? seed?.title ?? "New task",
      notes: task?.notes ?? seed?.notes ?? "",
      contactId: task?.contact_id ?? seed?.contactId ?? null,
      dueAt: task?.due_at ?? seed?.dueAt ?? null,
      reminderAt: task?.reminder_at ?? null,
      recurrence: task?.recurrence ?? "none",
      priority: advanced
        ? task?.priority === "normal"
          ? "medium"
          : (task?.priority ?? seed?.priority ?? "unspecified")
        : "unspecified",
      completed: task?.completed ?? false,
      sourceNoteId: advanced
        ? (task?.source_note_id ?? seed?.noteId ?? null)
        : null,
      workspace: advanced ? m : { timezone },
    });
    prepared.title = task?.title ?? seed?.title ?? "";
    setValue(prepared);
    const convert = (iso?: string | null) => {
      if (!iso) return "";
      const p = zonedParts(iso, timezone);
      return `${p.date}T${p.time}`;
    };
    setLocal(convert(task?.due_at ?? seed?.dueAt));
    setReminder(convert(task?.reminder_at));
    setFold("reject");
    setError("");
  }, [open, task, seed, timezone, advanced]);
  const update = (p: Partial<TaskEdit>) =>
    setValue((v) => (v ? { ...v, ...p } : v));
  const mPatch = (p: Partial<TaskEdit["workspace"]>) =>
    setValue((v) => (v ? { ...v, workspace: { ...v.workspace, ...p } } : v));
  async function save() {
    if (!value) return;
    setBusy(true);
    setError("");
    try {
      const instant = (x: string) =>
        x
          ? wallTimeToInstant(x.split("T")[0], x.split("T")[1], timezone, fold)
          : null;
      await onSave({
        ...value,
        dueAt: instant(local),
        reminderAt: instant(reminder),
      });
      onClose();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Task could not be saved. Your draft remains here.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? "Edit task" : "New task"}
      size="lg"
    >
      {value && (
        <form
          className="tw-editor"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label>
            Task title
            <input
              aria-label="Task title"
              required
              maxLength={200}
              value={value.title}
              onChange={(e) => update({ title: e.target.value })}
            />
          </label>
          <div className="tw-form-grid">
            <label>
              Contact
              <select
                aria-label="Task contact"
                value={value.contactId ?? ""}
                onChange={(e) => update({ contactId: e.target.value || null })}
              >
                <option value="">My tasks (personal)</option>
                {contacts
                  .filter((c) => c.type !== "Personal Tasks")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Property
              <select
                aria-label="Task property"
                disabled={!advanced}
                value={value.workspace.propertyContactId ?? ""}
                onChange={(e) =>
                  mPatch({ propertyContactId: e.target.value || null })
                }
              >
                <option value="">No property selected</option>
                {contacts
                  .filter((c) => c.property_address)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.property_address}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Due date / time ({timezone})
              <input
                type="datetime-local"
                aria-label="Task due date"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
              />
            </label>
            <label>
              Reminder date / time
              <input
                type="datetime-local"
                aria-label="Task reminder"
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
              />
            </label>
            <label>
              Priority
              <select
                aria-label="Task priority"
                disabled={!advanced}
                value={value.priority}
                onChange={(e) =>
                  update({ priority: e.target.value as TaskEdit["priority"] })
                }
              >
                {["unspecified", "high", "medium", "low"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                aria-label="Task status"
                disabled={!advanced}
                value={value.completed ? "completed" : value.workspace.status}
                onChange={(e) => {
                  update({ completed: e.target.value === "completed" });
                  if (e.target.value !== "completed")
                    mPatch({
                      status: e.target.value as "todo" | "in_progress",
                    });
                }}
              >
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <label>
              Assignee
              <select
                aria-label="Task assignee"
                disabled={!advanced}
                value={value.workspace.assigneeId || members[0]?.id || ""}
                onChange={(e) => mPatch({ assigneeId: e.target.value })}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Repeat
              <select
                aria-label="Task recurrence"
                disabled={!advanced || !!value.workspace.transactionId}
                value={value.recurrence}
                onChange={(e) =>
                  update({
                    recurrence: e.target.value as TaskEdit["recurrence"],
                  })
                }
              >
                {["none", "daily", "weekly", "monthly"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Category
              <input
                aria-label="Task category"
                maxLength={50}
                disabled={!advanced}
                value={value.workspace.category}
                onChange={(e) => mPatch({ category: e.target.value })}
              />
            </label>
            <label>
              Clock-change occurrence
              <select
                aria-label="Clock-change occurrence"
                value={fold}
                onChange={(e) => setFold(e.target.value as typeof fold)}
              >
                <option value="reject">Ask if ambiguous</option>
                <option value="earlier">First occurrence</option>
                <option value="later">Second occurrence</option>
              </select>
            </label>
          </div>
          <label>
            Notes
            <textarea
              aria-label="Task notes"
              maxLength={2000}
              value={value.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </label>
          {advanced && (
            <details>
              <summary>
                Prerequisites ({value.workspace.dependencies.length})
              </summary>
              <div className="tw-dependency-options">
                {value.workspace.dependencies
                  .filter((id) => !tasks.some((t) => t.id === id))
                  .map((id) => (
                    <div key={id} className="tw-notice">
                      A prerequisite is no longer available.{" "}
                      <button
                        type="button"
                        onClick={() =>
                          mPatch({
                            dependencies: value.workspace.dependencies.filter(
                              (d) => d !== id,
                            ),
                          })
                        }
                      >
                        Remove unavailable prerequisite
                      </button>
                    </div>
                  ))}
                {tasks
                  .filter((t) => t.id !== value.id)
                  .map((t) => (
                    <label key={t.id}>
                      <input
                        type="checkbox"
                        checked={value.workspace.dependencies.includes(t.id)}
                        onChange={(e) =>
                          mPatch({
                            dependencies: e.target.checked
                              ? [...value.workspace.dependencies, t.id]
                              : value.workspace.dependencies.filter(
                                  (id) => id !== t.id,
                                ),
                          })
                        }
                      />
                      {t.title} {t.completed ? "(complete)" : ""}
                    </label>
                  ))}
              </div>
            </details>
          )}
          <label className="tw-check">
            <input
              type="checkbox"
              checked={value.addToCalendar}
              onChange={(e) => update({ addToCalendar: e.target.checked })}
            />
            Also link to connected Google Calendar. Existing provider series
            edits require Calendar review.
          </label>
          <p className="tw-muted">
            Due tasks appear in MyARI Calendar without an external sync.
            Reminders here are in-app only when enabled in Calendar preferences.
            Completing a recurring task creates one next occurrence after the
            Tasks update.
          </p>
          {!advanced && (
            <p className="tw-muted">
              Advanced fields require the reviewed Tasks workspace update. Basic
              task creation and editing remain available.
            </p>
          )}
          {error && (
            <p role="alert" className="tw-error">
              {error}
            </p>
          )}
          <div className="tw-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="tw-primary"
              disabled={busy || !value.title.trim()}
            >
              {busy ? "Saving…" : "Save task"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
export type { Seed as TaskSeed };
