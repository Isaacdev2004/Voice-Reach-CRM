import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrCreatePersonalContact } from "@/lib/contacts/personal-contact";
import { syncTaskReminderToCalendar } from "@/lib/calendar/task-sync";
import { ownedNote, notesFailure } from "@/lib/notes/server";
import { z } from "zod";
const Schema = z.object({
  actionKey: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).default(""),
  contactId: z.string().uuid().nullable(),
  propertyContactId: z.string().uuid().nullable().default(null),
  dueAt: z.string().datetime().nullable(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  calendarReminder: z.boolean().default(false),
  completed: z.boolean().default(false),
  approved: z.literal(true),
});
export const POST = withApiHandler<{ params: Promise<{ id: string }> }>(
  async (r, c) => {
    const owner = await requireUserId(),
      { id } = await c.params,
      parsed = Schema.safeParse(await r.json().catch(() => null));
    if (!parsed.success)
      return apiError("Review and approve the task fields.", { status: 400 });
    try {
      if (!(await ownedNote(owner, id)))
        return apiError("Note not found.", { status: 404 });
      const b = parsed.data,
        contactId = b.contactId ?? (await getOrCreatePersonalContact(owner));
      const { data: contact, error: contactError } = await supabaseAdmin
        .from("contacts")
        .select("id, first_name, last_name, phone, email")
        .eq("owner_id", owner)
        .eq("id", contactId)
        .maybeSingle();
      if (contactError) return notesFailure();
      if (!contact) return apiError("Contact not found.", { status: 404 });
      let { data: task, error } = await supabaseAdmin.rpc(
        "create_note_task_v2",
        {
          p_owner: owner,
          p_note: id,
          p_action: b.actionKey,
          p_contact: contactId,
          p_property: b.propertyContactId,
          p_title: b.title,
          p_description: b.description,
          p_due: b.dueAt,
          p_priority: b.priority,
          p_completed: b.completed,
        },
      );
      // A missing new RPC has not executed a write. Preserve the foundation workflow
      // only for open tasks; never retry a timeout or ambiguous database response.
      if (
        error?.code === "PGRST202" &&
        error.message.includes("create_note_task_v2")
      ) {
        if (b.completed)
          return apiError(
            "Create this as an open task and complete it in Tasks, or apply the reviewed Notes 2 upgrade.",
            { status: 409 },
          );
        ({ data: task, error } = await supabaseAdmin.rpc("create_note_task", {
          p_owner: owner,
          p_note: id,
          p_action: b.actionKey,
          p_contact: contactId,
          p_property: b.propertyContactId,
          p_title: b.title,
          p_description: b.description,
          p_due: b.dueAt,
          p_priority: b.priority,
        }));
      }
      if (error?.message.includes("NOTE_TASK_CONFLICT"))
        return apiError(
          "That task action was already used with different details. Review the existing task instead.",
          { status: 409 },
        );
      if (error)
        return error.message.includes("NOTE_NOT_FOUND")
          ? apiError("Linked record not found.", { status: 404 })
          : notesFailure();
      let warning: string | undefined;
      if (
        b.calendarReminder &&
        !task.completed &&
        task.due_at &&
        !task.calendar_event_id
      ) {
        try {
          const sync = await syncTaskReminderToCalendar({
            ownerId: owner,
            taskId: task.id,
            contact,
            taskTitle: task.title,
            dueAt: task.due_at,
            notes: task.notes,
            recurrence: "none",
          });
          if (sync.synced && sync.eventId) {
            const saved = await supabaseAdmin
              .from("contact_tasks")
              .update({ calendar_event_id: sync.eventId })
              .eq("owner_id", owner)
              .eq("id", task.id);
            if (saved.error)
              warning = "Task saved; calendar status could not be confirmed.";
            else task.calendar_event_id = sync.eventId;
          } else warning = "Task saved; calendar reminder is unavailable.";
        } catch {
          warning = "Task saved; calendar reminder is unavailable.";
        }
      }
      return apiOk({ task, warning });
    } catch {
      return notesFailure();
    }
  },
);
