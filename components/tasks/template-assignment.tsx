"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/crm/modal";
import {
  proposedDeadlines,
  type TaskTemplate,
  type TaskContact,
  type TaskMember,
} from "@/lib/tasks/workspace-model";
import { TEMPLATE_DATE_NOTICE } from "@/lib/tasks/templates";
export function TemplateAssignment({
  template,
  onClose,
  onAssign,
  onSaveTemplate,
  contacts,
  members,
  timezone,
  advanced,
}: {
  template: TaskTemplate | null;
  onClose: () => void;
  onAssign: (body: unknown) => Promise<void>;
  onSaveTemplate: (body: TaskTemplate) => Promise<void>;
  contacts: TaskContact[];
  members: TaskMember[];
  timezone: string;
  advanced: boolean;
}) {
  const [draft, setDraft] = useState<TaskTemplate | null>(null),
    [contact, setContact] = useState(""),
    [property, setProperty] = useState(""),
    [base, setBase] = useState(""),
    [closing, setClosing] = useState(""),
    [assignee, setAssignee] = useState(""),
    [approved, setApproved] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [id, setId] = useState("");
  useEffect(() => {
    setDraft(template ? structuredClone(template) : null);
    setContact("");
    setProperty("");
    setBase("");
    setClosing("");
    setApproved(false);
    setError("");
    setNotice("");
    setId(crypto.randomUUID());
  }, [template]);
  let dates: (string | null)[] = [];
  try {
    if (draft && base)
      dates = proposedDeadlines(draft, base, timezone, closing || null);
  } catch {
    /* Invalid dates remain unassignable. */
  }
  const edit = (
    index: number,
    patch: Partial<TaskTemplate["steps"][number]>,
  ) => {
    setApproved(false);
    setDraft((t) =>
      t
        ? {
            ...t,
            steps: t.steps.map((s, i) =>
              i === index ? { ...s, ...patch } : s,
            ),
          }
        : null,
    );
  };
  async function assign() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      await onAssign({
        id,
        approved,
        template: draft,
        contactId: contact,
        propertyContactId: property || null,
        baseDate: base,
        closingDate: closing || null,
        timezone,
        assigneeId: assignee,
      });
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Checklist could not be assigned.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={!!template}
      onClose={onClose}
      title="Review and customize checklist"
      size="xl"
    >
      {draft && (
        <div className="tw-editor">
          <label>
            Template name
            <input
              aria-label="Template name"
              value={draft.name}
              onChange={(e) => {
                setDraft({ ...draft, name: e.target.value });
                setApproved(false);
              }}
            />
          </label>
          <p className="tw-muted">{TEMPLATE_DATE_NOTICE}</p>
          <div className="tw-form-grid">
            <label>
              Client
              <select
                aria-label="Checklist client"
                value={contact}
                onChange={(e) => {
                  setContact(e.target.value);
                  setApproved(false);
                }}
              >
                <option value="">Select an existing client</option>
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
                aria-label="Checklist property"
                value={property}
                onChange={(e) => {
                  setProperty(e.target.value);
                  setApproved(false);
                }}
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
              Contract / listing anchor date
              <input
                aria-label="Checklist anchor date"
                type="date"
                value={base}
                onChange={(e) => {
                  setBase(e.target.value);
                  setApproved(false);
                }}
              />
            </label>
            <label>
              Expected closing date (optional)
              <input
                aria-label="Checklist closing date"
                type="date"
                value={closing}
                onChange={(e) => {
                  setClosing(e.target.value);
                  setApproved(false);
                }}
              />
            </label>
            <label>
              Assigned agent
              <select
                aria-label="Checklist assignee"
                value={assignee || members[0]?.id || ""}
                onChange={(e) => {
                  setAssignee(e.target.value);
                  setApproved(false);
                }}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ol className="tw-template-editor">
            {draft.steps.map((step, i) => (
              <li key={i}>
                <b>{i + 1}</b>
                <div>
                  <label>
                    Milestone title
                    <input
                      aria-label={`Milestone ${i + 1} title`}
                      value={step.title}
                      maxLength={200}
                      onChange={(e) => edit(i, { title: e.target.value })}
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      aria-label={`Milestone ${i + 1} description`}
                      value={step.notes}
                      onChange={(e) => edit(i, { notes: e.target.value })}
                    />
                  </label>
                  <div className="tw-form-grid">
                    <label>
                      <select
                        aria-label={`Milestone ${i + 1} date anchor`}
                        value={step.anchor}
                        onChange={(e) =>
                          edit(i, {
                            anchor: e.target.value as "start" | "closing",
                          })
                        }
                      >
                        <option value="start">Calendar days from anchor</option>
                        <option value="closing">
                          Calendar days from actual closing
                        </option>
                      </select>
                      <input
                        aria-label={`Milestone ${i + 1} days`}
                        type="number"
                        min={-365}
                        max={730}
                        value={step.days}
                        onChange={(e) =>
                          edit(i, { days: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label>
                      Priority
                      <select
                        aria-label={`Milestone ${i + 1} priority`}
                        value={step.priority}
                        onChange={(e) =>
                          edit(i, {
                            priority: e.target.value as typeof step.priority,
                          })
                        }
                      >
                        {["high", "medium", "low"].map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="tw-muted">
                    Proposed:{" "}
                    {dates[i]
                      ? new Date(dates[i]!).toLocaleString(undefined, {
                          timeZone: timezone,
                        })
                      : step.anchor === "closing"
                        ? "No due date — provide an actual closing date"
                        : "Choose an anchor date"}{" "}
                    · {timezone}
                  </p>
                  <label>
                    Prerequisite milestone numbers (comma separated)
                    <input
                      aria-label={`Milestone ${i + 1} prerequisites`}
                      value={step.dependsOn.map((n) => n + 1).join(",")}
                      onChange={(e) =>
                        edit(i, {
                          dependsOn: e.target.value
                            .split(",")
                            .map((v) => v.trim())
                            .filter(Boolean)
                            .map((v) => Number(v) - 1),
                        })
                      }
                    />
                  </label>
                </div>
              </li>
            ))}
          </ol>
          <label className="tw-check">
            <input
              type="checkbox"
              checked={approved}
              onChange={(e) => setApproved(e.target.checked)}
            />
            I reviewed every proposed task, dependency, assignee and date
            against the actual agreement. Create these tasks.
          </label>
          {!advanced && (
            <p className="tw-muted">
              Assignment requires the reviewed Tasks workspace database update.
              You can review and save template versions now.
            </p>
          )}
          {notice && (
            <p className="tw-notice" role="status">
              {notice}
            </p>
          )}
          {error && (
            <p className="tw-error" role="alert">
              {error}
            </p>
          )}
          <div className="tw-actions">
            <button
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await onSaveTemplate({
                    ...draft,
                    id: `custom-${crypto.randomUUID()}`,
                  });
                  setNotice("Custom version saved.");
                } catch {
                  setError("Custom template could not be saved. Retry.");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              Save my template version
            </button>
            <button
              className="tw-primary"
              disabled={
                !advanced || !approved || !contact || !dates.length || busy
              }
              onClick={() => void assign()}
            >
              {busy ? "Saving…" : "Create reviewed checklist"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
