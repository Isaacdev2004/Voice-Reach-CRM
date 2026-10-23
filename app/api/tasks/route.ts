import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { getOrCreatePersonalContact } from "@/lib/contacts/personal-contact";
import { syncTaskReminderToCalendar } from "@/lib/calendar/task-sync";
import type { Recurrence } from "@/lib/calendar/google";
import { insertContactTask } from "@/lib/tasks/insert-task";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";
import {ownedRows} from "@/lib/delivery/owned-rows";
import {readContactSnapshot} from "@/lib/contacts/read-snapshot";

const RecurrenceSchema = z.enum(["none", "daily", "weekly", "monthly"]);

const CreateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  dueAt: z.string().datetime().optional().nullable(),
  reminderAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  recurrence: RecurrenceSchema.optional().default("none"),
  contactId: z.string().uuid().optional(),
  addToCalendar: z.boolean().optional().default(true),
});

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();

  try {
    const [tasks,contacts]=await Promise.all([ownedRows<Record<string,unknown>>("contact_tasks","*",ownerId),readContactSnapshot(supabaseAdmin,ownerId)]);
    return apiOk({tasks:tasks.map(t=>({...t,contacts:contacts.find(c=>c.id===t.contact_id)??null}))});
  }catch{return apiError("Tasks could not be loaded. Please retry.",{status:503});}
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

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = CreateTaskSchema.parse(await request.json());

  const contactId = body.contactId ?? (await getOrCreatePersonalContact(ownerId));
  const contact = await loadContact(ownerId, contactId);
  if (!contact) return apiError("Contact not found", { status: 404 });

  const recurrence = body.recurrence as Recurrence;

  const { data: task, error } = await insertContactTask({
    owner_id: ownerId,
    contact_id: contactId,
    title: body.title.trim(),
    due_at: body.dueAt ?? null,
    reminder_at: body.reminderAt ?? body.dueAt ?? null,
    notes: body.notes?.trim() || null,
    recurrence,
  });

  if (error) return apiError("Task could not be saved. Please retry.", { status: 503 });

  let calendarEventId: string | undefined;
  if (body.addToCalendar && body.dueAt) {
    const sync = await syncTaskReminderToCalendar({
      ownerId,
      taskId:task.id,
      contact,
      taskTitle: body.title,
      dueAt: body.dueAt,
      notes: body.notes,
      recurrence,
    });
    if (sync.synced && sync.eventId) {
      calendarEventId = sync.eventId;
      await supabaseAdmin
        .from("contact_tasks")
        .update({ calendar_event_id: sync.eventId })
        .eq("id", task.id)
        .eq("owner_id", ownerId);
    }
  }

  await writeAuditLog({
    ownerId,
    action: "CONTACT_TASK_CREATED",
    entityType: "contact_task",
    entityId: task.id,
    metadata: { contactId, title: body.title, calendarEventId, recurrence },
  });

  return apiOk(
    { task: { ...task, calendar_event_id: calendarEventId ?? task.calendar_event_id } },
    { status: 201 },
  );
});
