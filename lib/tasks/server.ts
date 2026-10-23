import { apiError, withApiHandler } from "@/lib/api-response";
import { ZodError } from "zod";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ownedRows } from "@/lib/delivery/owned-rows";
import { readContactSnapshot } from "@/lib/contacts/read-snapshot";
import { loadSavedSettings } from "@/lib/billing/settings-store";
import { loadCalendarPreferences } from "@/lib/calendar/load-preferences";
import { writeAuditLog } from "@/lib/audit";
import {
  PreferencesSchema,
  TaskEditSchema,
  cycleWouldForm,
  type TaskEdit,
  type TaskRecord,
  type TaskContact,
} from "./workspace-model";
import { getOrCreatePersonalContact } from "@/lib/contacts/personal-contact";
import { syncTaskReminderToCalendar } from "@/lib/calendar/task-sync";
export class TaskFailure extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export function tasksHandler(
  fn: (request: Request, owner: string) => Promise<Response>,
) {
  return withApiHandler(async (request) => {
    try {
      const owner = await requireUserId();
      if (
        request.headers.get("X-MyARI-Owner") &&
        request.headers.get("X-MyARI-Owner") !== owner
      )
        throw new TaskFailure("NOT_FOUND", 404);
      return await fn(request, owner);
    } catch (e) {
      if (e instanceof SyntaxError)
        return apiError("Check the request and try again.", { status: 400 });
      if (e instanceof Error && e.message === "Unauthorized")
        return apiError("Sign in required", { status: 401 });
      if (e instanceof ZodError)
        return apiError(
          "Check the task fields, dates and required selections.",
          { status: 400 },
        );
      if (e instanceof TaskFailure) {
        const labels: Record<string, string> = {
          NOT_FOUND: "Task, contact or related record not found.",
          CONFLICT: "This task changed in another view. Refresh before saving.",
          BLOCKED:
            "Complete the prerequisite tasks first, or review the dependencies.",
          CYCLE:
            "A task cannot depend on itself or form a circular dependency.",
          UPGRADE:
            "This action requires the reviewed Tasks workspace database update.",
          ASSIGNEE: "Choose an active team member from your workspace.",
          APPROVAL: "Review and approve the proposed tasks before saving.",
          INVALID: "Review the selected task and its fields.",
        };
        return apiError(
          labels[e.code] ?? "Task action could not be completed.",
          { status: e.status, code: e.code },
        );
      }
      const code = (e as { message?: string })?.message ?? "";
      if (/TASK_(BLOCKED|CYCLE|NOT_FOUND|CONFLICT)/.test(code)) {
        const c = code.match(/TASK_(BLOCKED|CYCLE|NOT_FOUND|CONFLICT)/)![1];
        return apiError(
          c === "BLOCKED"
            ? "Complete the prerequisite tasks first."
            : c === "CYCLE"
              ? "Circular dependencies are not allowed."
              : "This record changed or is unavailable. Refresh and retry.",
          { status: 409, code: c },
        );
      }
      return apiError(
        "Tasks are temporarily unavailable. Your draft is still here; please retry.",
        { status: 503 },
      );
    }
  });
}
const absent = (e: { code?: string } | null) =>
  !!e && ["42703", "PGRST204", "42P01", "PGRST205"].includes(e.code ?? "");
export async function taskMode(owner: string) {
  const probe = await supabaseAdmin
    .from("contact_tasks")
    .select("workspace")
    .eq("owner_id", owner)
    .limit(1);
  if (probe.error) {
    if (absent(probe.error)) return false;
    throw probe.error;
  }
  const r = await supabaseAdmin
    .from("task_transactions")
    .select("id")
    .eq("owner_id", owner)
    .limit(1);
  if (r.error) {
    if (absent(r.error)) return false;
    throw r.error;
  }
  return true;
}
export async function readTasks(owner: string) {
  return await ownedRows<TaskRecord>("contact_tasks", "*", owner);
}
export async function taskPreferences(owner: string) {
  const r = await supabaseAdmin
    .from("audit_logs")
    .select("metadata")
    .eq("owner_id", owner)
    .eq("entity_type", "task_preferences")
    .eq("action", "TASK_PREFERENCES_SAVED")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (r.error) throw r.error;
  return PreferencesSchema.parse(r.data?.metadata?.preferences ?? {});
}
export async function taskContext(owner: string) {
  const [contacts, settings, calendar] = await Promise.all([
    readContactSnapshot(supabaseAdmin, owner),
    loadSavedSettings(owner),
    loadCalendarPreferences(owner),
  ]);
  return {
    contacts: contacts.map((c) => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      email: c.email,
      phone: c.phone,
      type: c.type,
      property_address: c.property_address,
    })) as TaskContact[],
    members: [
      { id: owner, name: settings?.profile.fullName || "You" },
      ...(settings?.team ?? [])
        .filter((t) => t.status === "active" && t.id !== owner)
        .map((t) => ({ id: t.id, name: t.name })),
    ],
    timezone: settings?.profile.timezone || calendar.timezone,
    monday: calendar.mondayStart,
    inAppReminders: calendar.inAppReminders,
  };
}
export async function validateAssociations(owner: string, input: TaskEdit) {
  const c = await taskContext(owner);
  for (const id of [input.contactId, input.workspace.propertyContactId])
    if (
      id &&
      !c.contacts.some(
        (v) =>
          v.id === id &&
          (id !== input.workspace.propertyContactId || v.property_address),
      )
    )
      throw new TaskFailure("NOT_FOUND", 404);
  if (
    input.workspace.assigneeId &&
    !c.members.some((m) => m.id === input.workspace.assigneeId)
  )
    throw new TaskFailure("ASSIGNEE");
  if (input.sourceNoteId) {
    const n = await supabaseAdmin
      .from("contact_notes")
      .select("id")
      .eq("owner_id", owner)
      .eq("id", input.sourceNoteId)
      .maybeSingle();
    if (n.error) throw n.error;
    if (!n.data) throw new TaskFailure("NOT_FOUND", 404);
  }
  if (input.workspace.sourceCampaignId) {
    const n = await supabaseAdmin
      .from("campaigns")
      .select("id")
      .eq("owner_id", owner)
      .eq("id", input.workspace.sourceCampaignId)
      .maybeSingle();
    if (n.error) throw n.error;
    if (!n.data) throw new TaskFailure("NOT_FOUND", 404);
  }
  if (input.workspace.sourceEventId) {
    const n = await supabaseAdmin
      .from("calendar_events")
      .select("id")
      .eq("owner_id", owner)
      .eq("id", input.workspace.sourceEventId)
      .maybeSingle();
    if (n.error) throw n.error;
    if (!n.data) throw new TaskFailure("NOT_FOUND", 404);
  }
  return c;
}
export async function saveTask(owner: string, raw: unknown) {
  const input = TaskEditSchema.parse(raw),
    advanced = await taskMode(owner),
    context = await validateAssociations(owner, input),
    tasks = await readTasks(owner),
    previous = tasks.find((t) => t.id === input.id);
  if (previous && input.expectedUpdatedAt !== previous.updated_at)
    throw new TaskFailure("CONFLICT", 409);
  if (!previous && input.expectedUpdatedAt)
    throw new TaskFailure("NOT_FOUND", 404);
  if (
    input.workspace.transactionId &&
    (!previous ||
      ((previous.workspace ?? {}) as { transactionId?: string })
        .transactionId !== input.workspace.transactionId)
  )
    throw new TaskFailure("NOT_FOUND", 404);
  const previousTransaction =
    (previous?.workspace as { transactionId?: string } | undefined)
      ?.transactionId ?? null;
  if (previous && previousTransaction !== input.workspace.transactionId)
    throw new TaskFailure("INVALID");
  for (const id of input.workspace.dependencies)
    if (!tasks.some((t) => t.id === id))
      throw new TaskFailure("NOT_FOUND", 404);
  if (cycleWouldForm(tasks, input.id, input.workspace.dependencies))
    throw new TaskFailure("CYCLE");
  if (
    input.completed &&
    input.workspace.dependencies.some(
      (id) => !tasks.find((t) => t.id === id)?.completed,
    )
  )
    throw new TaskFailure("BLOCKED", 409);
  if (
    !advanced &&
    (input.priority !== "unspecified" ||
      input.workspace.status !== "todo" ||
      input.workspace.category ||
      input.workspace.propertyContactId ||
      input.workspace.dependencies.length ||
      (input.workspace.assigneeId && input.workspace.assigneeId !== owner) ||
      input.sourceNoteId ||
      input.workspace.sourceCampaignId ||
      input.workspace.sourceEventId)
  )
    throw new TaskFailure("UPGRADE", 409);
  if (input.workspace.transactionId && input.recurrence !== "none")
    throw new TaskFailure("INVALID");
  const contactId =
    input.contactId ?? (await getOrCreatePersonalContact(owner));
  const row = {
    id: input.id,
    owner_id: owner,
    contact_id: contactId,
    title: input.title,
    notes: input.notes || null,
    due_at: input.dueAt,
    reminder_at: input.completed ? null : input.reminderAt,
    recurrence: input.recurrence,
    completed: input.completed,
    completed_at: input.completed
      ? previous?.completed
        ? previous.completed_at
        : new Date().toISOString()
      : null,
    updated_at: new Date().toISOString(),
    ...(advanced
      ? {
          workspace: {
            ...input.workspace,
            operationKey: (
              previous?.workspace as { operationKey?: string } | undefined
            )?.operationKey,
            recurrenceParentId: (
              previous?.workspace as { recurrenceParentId?: string } | undefined
            )?.recurrenceParentId,
            assigneeId: input.workspace.assigneeId || owner,
          },
          priority: input.priority === "unspecified" ? null : input.priority,
          source_note_id: input.sourceNoteId,
          property_contact_id: input.workspace.propertyContactId,
        }
      : {}),
  };
  let q = previous
    ? supabaseAdmin
        .from("contact_tasks")
        .update(row)
        .eq("owner_id", owner)
        .eq("id", input.id)
        .eq("updated_at", previous.updated_at!)
    : supabaseAdmin.from("contact_tasks").insert(row);
  const r = await q.select("*").maybeSingle();
  if (r.error) throw r.error;
  if (!r.data) throw new TaskFailure("CONFLICT", 409);
  await writeAuditLog({
    ownerId: owner,
    action: previous ? "CONTACT_TASK_UPDATED" : "CONTACT_TASK_CREATED",
    entityType: "contact_task",
    entityId: input.id,
    metadata: {
      contactId,
      title: input.title,
      fields: ["title", "due_at", "completed", "workspace"],
    },
  });
  let calendar = "MyARI Calendar reads the saved due date directly.";
  if (input.addToCalendar && input.dueAt && !input.completed) {
    const c = context.contacts.find((c) => c.id === contactId) ?? {
      id: contactId,
    };
    const sync = await syncTaskReminderToCalendar({
      ownerId: owner,
      taskId: input.id,
      contact: c,
      taskTitle: input.title,
      dueAt: input.dueAt,
      notes: input.notes,
      recurrence: input.recurrence,
    });
    calendar = sync.synced
      ? "Google Calendar link verified; edits to an existing provider series require review in Calendar."
      : "Task saved. Google Calendar sync is unavailable; the task remains visible in MyARI Calendar.";
    if (sync.synced && sync.eventId) {
      await supabaseAdmin
        .from("contact_tasks")
        .update({ calendar_event_id: sync.eventId })
        .eq("owner_id", owner)
        .eq("id", input.id);
    }
  }
  return { task: r.data, calendar };
}
