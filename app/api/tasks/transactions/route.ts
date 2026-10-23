import { z } from "zod";
import { apiSuccess } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { tasksHandler, taskContext, TaskFailure } from "@/lib/tasks/server";
import { wallTimeToInstant } from "@/lib/calendar/time";
import { writeAuditLog } from "@/lib/audit";
const Body = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(150),
  closingDate: z.string().nullable(),
  assigneeId: z.string().max(200),
});
export const PATCH = tasksHandler(async (req, owner) => {
  const b = Body.parse(await req.json()),
    c = await taskContext(owner);
  if (b.closingDate) wallTimeToInstant(b.closingDate, "09:00", c.timezone);
  if (b.assigneeId && !c.members.some((m) => m.id === b.assigneeId))
    throw new TaskFailure("ASSIGNEE");
  const r = await supabaseAdmin
    .from("task_transactions")
    .select("*")
    .eq("owner_id", owner)
    .eq("id", b.id)
    .maybeSingle();
  if (r.error) throw r.error;
  if (!r.data) throw new TaskFailure("NOT_FOUND", 404);
  const p = r.data.payload;
  const update = await supabaseAdmin
    .from("task_transactions")
    .update({
      payload: {
        ...p,
        name: b.name,
        closingDate: b.closingDate,
        assigneeId: b.assigneeId || owner,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("owner_id", owner)
    .eq("id", b.id)
    .eq("updated_at", r.data.updated_at)
    .select("*")
    .maybeSingle();
  if (update.error) throw update.error;
  if (!update.data) throw new TaskFailure("CONFLICT", 409);
  await writeAuditLog({
    ownerId: owner,
    action: "TASK_TRANSACTION_UPDATED",
    entityType: "contact",
    entityId: r.data.contact_id,
    metadata: { transactionId: b.id, title: b.name },
  });
  return apiSuccess({ transaction: update.data });
});
