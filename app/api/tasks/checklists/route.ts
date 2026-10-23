import { apiSuccess } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

import {
  tasksHandler,
  taskMode,
  TaskFailure,
  taskContext,
} from "@/lib/tasks/server";
import {
  AssignmentSchema,
  proposedDeadlines,
} from "@/lib/tasks/workspace-model";
export const POST = tasksHandler(async (req, owner) => {
  const input = AssignmentSchema.parse(await req.json());
  if (!(await taskMode(owner))) throw new TaskFailure("UPGRADE", 409);
  const c = await taskContext(owner);
  if (
    !c.contacts.some((c) => c.id === input.contactId) ||
    (input.propertyContactId &&
      !c.contacts.some(
        (c) => c.id === input.propertyContactId && c.property_address,
      ))
  )
    throw new TaskFailure("NOT_FOUND", 404);
  if (input.assigneeId && !c.members.some((m) => m.id === input.assigneeId))
    throw new TaskFailure("ASSIGNEE");
  const ids = input.template.steps.map(() => crypto.randomUUID()),
    dates = proposedDeadlines(input.template, input.baseDate, input.timezone);
  const tasks = input.template.steps.map((s, i) => {
    if (s.dependsOn.some((n) => n >= i)) throw new TaskFailure("CYCLE");
    return {
      id: ids[i],
      title: s.title,
      notes: s.notes,
      dueAt: dates[i],
      priority: s.priority,
      workspace: {
        status: "todo",
        category: s.category,
        propertyContactId: input.propertyContactId,
        assigneeId: input.assigneeId || owner,
        dependencies: s.dependsOn.map((n) => ids[n]),
        transactionId: input.id,
        order: i,
        timezone: input.timezone,
      },
    };
  });
  const key = [
    input.template.id,
    input.contactId,
    input.propertyContactId ?? "",
    input.baseDate,
  ].join(":");
  const payload = {
    name: input.template.name,
    kind: input.template.kind,
    propertyContactId: input.propertyContactId,
    baseDate: input.baseDate,
    closingDate: input.closingDate,
    assigneeId: input.assigneeId || owner,
    taskIds: ids,
    template: input.template,
  };
  const r = await supabaseAdmin.rpc("assign_task_checklist", {
    p_owner: owner,
    p_id: input.id,
    p_contact: input.contactId,
    p_key: key,
    p_payload: payload,
    p_tasks: tasks,
  });
  if (r.error) throw r.error;
  return apiSuccess({ transaction: r.data, duplicate: r.data.id !== input.id });
});
