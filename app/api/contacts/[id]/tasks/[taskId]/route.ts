import { apiSuccess } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { writeAuditLog } from "@/lib/audit";
import {
  tasksHandler,
  saveTask,
  taskMode,
  TaskFailure,
} from "@/lib/tasks/server";
import { meta, priority, type TaskRecord } from "@/lib/tasks/workspace-model";
import { z } from "zod";
type Context = { params: Promise<{ id: string; taskId: string }> };
const Body = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
  reminderAt: z.string().datetime({ offset: true }).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  completed: z.boolean().optional(),
});
export async function PATCH(req: Request, context: Context) {
  return tasksHandler(async (request, owner) => {
    const ids = z
        .object({ id: z.string().uuid(), taskId: z.string().uuid() })
        .parse(await context.params),
      b = Body.parse(await request.json());
    const r = await supabaseAdmin
      .from("contact_tasks")
      .select("*")
      .eq("owner_id", owner)
      .eq("contact_id", ids.id)
      .eq("id", ids.taskId)
      .maybeSingle();
    if (r.error) throw r.error;
    if (!r.data) throw new TaskFailure("NOT_FOUND", 404);
    const t = r.data as TaskRecord,
      advanced = await taskMode(owner);
    return apiSuccess(
      await saveTask(owner, {
        id: t.id,
        expectedUpdatedAt: t.updated_at,
        title: b.title ?? t.title,
        contactId: t.contact_id,
        notes: b.notes === undefined ? (t.notes ?? "") : (b.notes ?? ""),
        dueAt: b.dueAt === undefined ? t.due_at : b.dueAt,
        reminderAt: b.reminderAt === undefined ? t.reminder_at : b.reminderAt,
        completed: b.completed ?? t.completed,
        recurrence: t.recurrence ?? "none",
        priority: advanced ? priority(t) : "unspecified",
        sourceNoteId: advanced ? (t.source_note_id ?? null) : null,
        workspace: advanced ? meta(t) : {},
      }),
    );
  })(req, undefined);
}
export async function DELETE(req: Request, context: Context) {
  return tasksHandler(async (_, owner) => {
    const ids = z
      .object({ id: z.string().uuid(), taskId: z.string().uuid() })
      .parse(await context.params);
    const r = await supabaseAdmin
      .from("contact_tasks")
      .delete()
      .eq("owner_id", owner)
      .eq("contact_id", ids.id)
      .eq("id", ids.taskId)
      .select("id");
    if (r.error) throw r.error;
    if (!r.data?.length) throw new TaskFailure("NOT_FOUND", 404);
    await writeAuditLog({
      ownerId: owner,
      action: "CONTACT_TASK_DELETED",
      entityType: "contact_task",
      entityId: ids.taskId,
      metadata: { contactId: ids.id },
    });
    return apiSuccess({ deleted: true });
  })(req, undefined);
}
