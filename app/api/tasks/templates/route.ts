import { apiSuccess } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import { ownedRows } from "@/lib/delivery/owned-rows";
import { tasksHandler } from "@/lib/tasks/server";
import { TemplateSchema } from "@/lib/tasks/workspace-model";
import { TASK_TEMPLATES } from "@/lib/tasks/templates";
export const GET = tasksHandler(async (_, owner) => {
  const rows = await ownedRows<{
    id: string;
    created_at: string;
    metadata?: { template?: unknown };
  }>("audit_logs", "*", owner, undefined, {
    entity_type: "task_template",
    action: "TASK_TEMPLATE_SAVED",
  });
  rows.sort(
    (a, b) =>
      b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id),
  );
  const seen = new Set<string>(),
    custom = [];
  for (const row of rows) {
    const t = TemplateSchema.safeParse(row.metadata?.template);
    if (t.success && !seen.has(t.data.id)) {
      seen.add(t.data.id);
      custom.push(t.data);
    }
  }
  return apiSuccess({ templates: [...TASK_TEMPLATES, ...custom] });
});
export const POST = tasksHandler(async (req, owner) => {
  const template = TemplateSchema.parse(await req.json());
  await writeAuditLog({
    ownerId: owner,
    action: "TASK_TEMPLATE_SAVED",
    entityType: "task_template",
    metadata: {
      template: {
        ...template,
        id: template.id.startsWith("custom-")
          ? template.id
          : "custom-" + crypto.randomUUID(),
      },
    },
  });
  return apiSuccess({ saved: true });
});
