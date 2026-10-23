import { apiSuccess } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ownedRows } from "@/lib/delivery/owned-rows";
import {
  tasksHandler,
  taskMode,
  taskContext,
  readTasks,
  taskPreferences,
  saveTask,
  TaskFailure,
} from "@/lib/tasks/server";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import type { TaskTransaction } from "@/lib/tasks/workspace-model";
export const GET = tasksHandler(async (_, owner) => {
  const [tasks, context, preferences, advanced] = await Promise.all([
    readTasks(owner),
    taskContext(owner),
    taskPreferences(owner),
    taskMode(owner),
  ]);
  const transactions = advanced
    ? await ownedRows<TaskTransaction>("task_transactions", "*", owner)
    : [];
  return apiSuccess({ tasks, ...context, preferences, advanced, transactions });
});
export const POST = tasksHandler(async (req, owner) =>
  apiSuccess(await saveTask(owner, await req.json())),
);
export const DELETE = tasksHandler(async (req, owner) => {
  const id = z.string().uuid().parse(new URL(req.url).searchParams.get("id"));
  const r = await supabaseAdmin
    .from("contact_tasks")
    .delete()
    .eq("owner_id", owner)
    .eq("id", id)
    .select("id,contact_id");
  if (r.error) throw r.error;
  if (!r.data?.length) throw new TaskFailure("NOT_FOUND", 404);
  await writeAuditLog({
    ownerId: owner,
    action: "CONTACT_TASK_DELETED",
    entityType: "contact_task",
    entityId: id,
    metadata: { contactId: r.data[0].contact_id },
  });
  return apiSuccess({ deleted: true });
});
