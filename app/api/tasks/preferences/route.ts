import { apiSuccess } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import { tasksHandler, taskPreferences } from "@/lib/tasks/server";
import { PreferencesSchema } from "@/lib/tasks/workspace-model";
export const GET = tasksHandler(async (_, owner) =>
  apiSuccess({ preferences: await taskPreferences(owner) }),
);
export const POST = tasksHandler(async (req, owner) => {
  const preferences = PreferencesSchema.parse(await req.json());
  await writeAuditLog({
    ownerId: owner,
    action: "TASK_PREFERENCES_SAVED",
    entityType: "task_preferences",
    metadata: { preferences },
  });
  return apiSuccess({ preferences });
});
