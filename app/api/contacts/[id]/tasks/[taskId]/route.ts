import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { isUuid } from "@/lib/contacts/is-uuid";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string; taskId: string }> };

const PatchTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  dueAt: z.string().datetime().optional().nullable(),
  reminderAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  completed: z.boolean().optional(),
});

export const PATCH = withApiHandler<RouteContext>(async (request, context) => {
  const ownerId = await requireUserId();
  const { id, taskId } = await context.params;
  if (!isUuid(id) || !isUuid(taskId)) return apiError("Invalid id", { status: 400 });

  const body = PatchTaskSchema.parse(await request.json());
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.dueAt !== undefined) updates.due_at = body.dueAt;
  if (body.reminderAt !== undefined) updates.reminder_at = body.reminderAt;
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;
  if (body.completed !== undefined) {
    updates.completed = body.completed;
    updates.completed_at = body.completed ? new Date().toISOString() : null;
  }

  const { data, error } = await supabaseAdmin
    .from("contact_tasks")
    .update(updates)
    .eq("owner_id", ownerId)
    .eq("contact_id", id)
    .eq("id", taskId)
    .select("*")
    .maybeSingle();

  if (error) return apiError(error.message, { status: 500 });
  if (!data) return apiError("Task not found", { status: 404 });

  await writeAuditLog({
    ownerId,
    action: "CONTACT_TASK_UPDATED",
    entityType: "contact_task",
    entityId: taskId,
    metadata: { contactId: id, updates: Object.keys(updates) },
  });

  return apiOk({ task: data });
});

export const DELETE = withApiHandler<RouteContext>(async (_request, context) => {
  const ownerId = await requireUserId();
  const { id, taskId } = await context.params;
  if (!isUuid(id) || !isUuid(taskId)) return apiError("Invalid id", { status: 400 });

  const { error } = await supabaseAdmin
    .from("contact_tasks")
    .delete()
    .eq("owner_id", ownerId)
    .eq("contact_id", id)
    .eq("id", taskId);

  if (error) return apiError(error.message, { status: 500 });

  await writeAuditLog({
    ownerId,
    action: "CONTACT_TASK_DELETED",
    entityType: "contact_task",
    entityId: taskId,
    metadata: { contactId: id },
  });

  return apiOk({ deleted: true });
});
