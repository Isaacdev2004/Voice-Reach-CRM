import { apiError, apiSuccess, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const ActionSchema = z.object({
  type: z.enum([
    "send_sms",
    "send_email",
    "notify_user",
    "assign_task",
    "start_campaign",
    "trigger_ai_follow_up",
    "add_tag",
  ]),
  config: z.record(z.string(), z.unknown()).default({}),
});

const RuleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().optional().default(""),
  trigger_type: z.enum([
    "contact_added",
    "voicemail_listened",
    "email_opened",
    "sms_replied",
    "callback_received",
    "tag_added",
    "lead_inactive",
    "engagement_score",
    "manual",
  ]),
  trigger_config: z.record(z.string(), z.unknown()).optional().default({}),
  actions: z.array(ActionSchema).min(1),
  enabled: z.boolean().optional().default(true),
});

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();
  const { data, error } = await supabaseAdmin
    .from("automation_rules")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });
  if (error) return apiError(error.message, { status: 500 });
  return apiSuccess({ rules: data ?? [] });
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = RuleSchema.parse(await request.json());

  const row = {
    owner_id: ownerId,
    name: body.name,
    description: body.description,
    trigger_type: body.trigger_type,
    trigger_config: body.trigger_config,
    actions: body.actions,
    enabled: body.enabled,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = body.id
    ? await supabaseAdmin
        .from("automation_rules")
        .update(row)
        .eq("id", body.id)
        .eq("owner_id", ownerId)
        .select("*")
        .single()
    : await supabaseAdmin
        .from("automation_rules")
        .insert(row)
        .select("*")
        .single();

  if (error) return apiError(error.message, { status: 500 });

  await writeAuditLog({
    ownerId,
    action: body.id ? "AUTOMATION_RULE_UPDATED" : "AUTOMATION_RULE_CREATED",
    entityType: "automation_rule",
    entityId: null,
    metadata: { name: body.name, trigger: body.trigger_type, actions: body.actions.length },
  });

  return apiSuccess({ rule: data });
});

export const DELETE = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return apiError("Missing id", { status: 400 });

  const { error } = await supabaseAdmin
    .from("automation_rules")
    .delete()
    .eq("id", id)
    .eq("owner_id", ownerId);
  if (error) return apiError(error.message, { status: 500 });

  await writeAuditLog({
    ownerId,
    action: "AUTOMATION_RULE_DELETED",
    entityType: "automation_rule",
    entityId: null,
    metadata: { ruleId: id },
  });

  return apiSuccess({ ok: true });
});
