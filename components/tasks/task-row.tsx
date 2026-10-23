"use client";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import {
  meta,
  priority,
  status,
  blocked,
  overdue,
  type TaskRecord,
  type TaskContact,
  type TaskMember,
} from "@/lib/tasks/workspace-model";
export function WorkspaceTaskRow({
  task,
  tasks,
  contacts,
  members,
  timezone,
  onToggle,
  onEdit,
  onDelete,
  onStatus,
  pending = false,
  advanced = false,
}: {
  task: TaskRecord;
  tasks: TaskRecord[];
  contacts: TaskContact[];
  members: TaskMember[];
  timezone: string;
  onToggle: (t: TaskRecord) => void;
  onEdit: (t: TaskRecord) => void;
  onDelete: (t: TaskRecord) => void;
  onStatus: (t: TaskRecord, status: string) => void;
  pending?: boolean;
  advanced?: boolean;
}) {
  const m = meta(task),
    contact = contacts.find((c) => c.id === task.contact_id),
    property = contacts.find((c) => c.id === m.propertyContactId),
    person = members.find((c) => c.id === (m.assigneeId || task.owner_id)),
    isBlocked = blocked(task, tasks),
    personal = contact?.type === "Personal Tasks",
    contactName =
      contact && !personal
        ? [contact.first_name, contact.last_name].filter(Boolean).join(" ")
        : "Personal task";
  return (
    <article
      className={`tw-task-row ${task.completed ? "is-completed" : ""} ${isBlocked ? "is-blocked" : ""}`}
      data-task-id={task.id}
    >
      <input
        type="checkbox"
        aria-label={`${task.completed ? "Reopen" : "Complete"} ${task.title}`}
        checked={task.completed}
        disabled={pending || isBlocked}
        onChange={() => onToggle(task)}
      />
      <div className="tw-task-title">
        <button
          className="tw-title-button"
          onClick={() => onEdit(task)}
          title={task.title}
        >
          {task.title}
        </button>
        {isBlocked && (
          <small className="tw-blocked-label">
            <Icon name="lock" />
            Blocked by{" "}
            {
              m.dependencies.filter(
                (id) => !tasks.some((t) => t.id === id && t.completed),
              ).length
            }{" "}
            prerequisite(s)
          </small>
        )}
        {task.source_note_id && (
          <Link
            className="tw-source-link"
            href={`/dashboard/notes?note=${task.source_note_id}`}
          >
            Source note
          </Link>
        )}
        {task.recurrence && task.recurrence !== "none" && (
          <small>Repeats {task.recurrence}</small>
        )}
      </div>
      <div className="tw-contact-cell">
        {contact && !personal ? (
          <Link href={`/dashboard/contacts/${contact.id}`}>
            <span className="tw-avatar">
              {contact.first_name?.[0]}
              {contact.last_name?.[0]}
            </span>
            <span>{contactName}</span>
          </Link>
        ) : (
          <span className="tw-muted">Personal task</span>
        )}
        <small>Assigned: {person?.name || "Assignee unavailable"}</small>
      </div>
      <div className="tw-property-cell">
        {property?.property_address ? (
          <Link href={`/dashboard/properties?contactId=${property.id}`}>
            <Icon name="home" />
            {property.property_address}
          </Link>
        ) : (
          <span className="tw-muted">No property</span>
        )}
      </div>
      <span className="tw-category">{m.category || "Uncategorized"}</span>
      <span className={`tw-priority tw-${priority(task)}`}>
        {priority(task)}
      </span>
      <span className={`tw-due ${overdue(task, timezone) ? "is-overdue" : ""}`}>
        <Icon name="calendar_today" />
        {task.due_at && Number.isFinite(Date.parse(task.due_at))
          ? new Date(task.due_at).toLocaleString(undefined, {
              timeZone: timezone,
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          : "No due date"}
      </span>
      <details className="tw-row-menu">
        <summary aria-label={`Actions for ${task.title}`}>
          <Icon name="more_horiz" />
        </summary>
        <div>
          <button onClick={() => onEdit(task)}>Edit task</button>
          <button
            onClick={() => onToggle(task)}
            disabled={pending || isBlocked}
          >
            {task.completed ? "Reopen" : "Mark completed"}
          </button>
          {advanced && (
            <label>
              Move to
              <select
                aria-label={`Move ${task.title}`}
                value={status(task)}
                onChange={(e) => onStatus(task, e.target.value)}
              >
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="completed" disabled={isBlocked}>
                  Completed
                </option>
              </select>
            </label>
          )}
          {contact && !personal && (
            <Link href={`/dashboard/contacts/${contact.id}`}>Open contact</Link>
          )}
          {task.source_note_id && (
            <Link href={`/dashboard/notes?note=${task.source_note_id}`}>
              Open source note
            </Link>
          )}
          <Link
            href={`/dashboard/calendar?new=event&contactId=${task.contact_id}`}
          >
            Schedule follow-up
          </Link>
          <Link href="/dashboard/campaigns">Choose campaign</Link>
          <button className="tw-danger" onClick={() => onDelete(task)}>
            Delete task
          </button>
        </div>
      </details>
    </article>
  );
}
