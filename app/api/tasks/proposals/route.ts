import { z } from "zod";
import { apiSuccess } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  tasksHandler,
  taskMode,
  TaskFailure,
  validateAssociations,
} from "@/lib/tasks/server";
import { TaskEditSchema } from "@/lib/tasks/workspace-model";
import { getOrCreatePersonalContact } from "@/lib/contacts/personal-contact";
const Schema = z.object({
  id: z.string().uuid(),
  approved: z.literal(true),
  tasks: z.array(TaskEditSchema).min(1).max(20),
});
export const POST = tasksHandler(async (req, owner) => {
  const input = Schema.parse(await req.json());
  if (!(await taskMode(owner))) throw new TaskFailure("UPGRADE", 409);
  for (const t of input.tasks) {
    await validateAssociations(owner, t);
    if (
      t.workspace.dependencies.length ||
      t.workspace.transactionId ||
      t.completed ||
      t.expectedUpdatedAt ||
      t.workspace.operationKey ||
      t.workspace.recurrenceParentId
    )
      throw new TaskFailure("INVALID");
  }
  const rows = [];
  for (const t of input.tasks)
    rows.push({
      ...t,
      contactId: t.contactId ?? (await getOrCreatePersonalContact(owner)),
    });
  const r = await supabaseAdmin.rpc("create_reviewed_tasks", {
    p_owner: owner,
    p_batch: input.id,
    p_tasks: rows,
  });
  if (r.error) throw r.error;
  return apiSuccess({ taskIds: r.data });
});
