import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { syncTaskReminderToCalendar } from "@/lib/calendar/task-sync";
import { isUuid } from "@/lib/contacts/is-uuid";
import { insertContactTask } from "@/lib/tasks/insert-task";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  dueAt: z.string().datetime().optional().nullable(),
  reminderAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  recurrence: z.enum(["none", "daily", "weekly", "monthly"]).optional().default("none"),
  addToCalendar: z.boolean().optional().default(false),
});

async function loadContact(ownerId: string, contactId: string) {
  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("id, first_name, last_name, phone, email")
    .eq("owner_id", ownerId)
    .eq("id", contactId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export const GET = withApiHandler<RouteContext>(async (_request, context) => {
  const ownerId = await requireUserId();
  const { id } = await context.params;
  if (!isUuid(id)) return apiError("Invalid contact id", { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("contact_tasks")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("contact_id", id)
    .order("completed", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) return apiError(error.message, { status: 500 });
  return apiOk({ tasks: data ?? [] });
});

export const POST = withApiHandler<RouteContext>(async (request, context) => {
  const ownerId = await requireUserId();
  const { id } = await context.params;
  if (!isUuid(id)) return apiError("Invalid contact id", { status: 400 });

  const body = CreateTaskSchema.parse(await request.json());
  const contact = await loadContact(ownerId, id);
  if (!contact) return apiError("Contact not found", { status: 404 });

  const { data: task, error } = await insertContactTask({
    owner_id: ownerId,
    contact_id: id,
    title: body.title.trim(),
    due_at: body.dueAt ?? null,
    reminder_at: body.reminderAt ?? body.dueAt ?? null,
    notes: body.notes?.trim() || null,
    recurrence: body.recurrence,
  });

  if (error) return apiError(error.message, { status: 500 });

  let calendarEventId: string | undefined;
  if (body.addToCalendar && body.dueAt) {
    const sync = await syncTaskReminderToCalendar({
      ownerId,
      contact,
      taskTitle: body.title,
      dueAt: body.dueAt,
      notes: body.notes,
      recurrence: body.recurrence,
    });
    if (sync.synced && sync.eventId) {
      calendarEventId = sync.eventId;
      await supabaseAdmin
        .from("contact_tasks")
        .update({ calendar_event_id: sync.eventId })
        .eq("id", task.id);
    }
  }

  await writeAuditLog({
    ownerId,
    action: "CONTACT_TASK_CREATED",
    entityType: "contact_task",
    entityId: task.id,
    metadata: { contactId: id, title: body.title, calendarEventId },
  });

  return apiOk({ task: { ...task, calendar_event_id: calendarEventId ?? task.calendar_event_id } }, { status: 201 });
});
