import { writeAuditLog } from "@/lib/audit";
import { sendToContact } from "@/lib/providers/dispatch-message";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type AutomationActionType =
  | "send_sms"
  | "send_email"
  | "notify_user"
  | "assign_task"
  | "start_campaign"
  | "trigger_ai_follow_up"
  | "add_tag";

export type AutomationAction = {
  type: AutomationActionType;
  config: Record<string, unknown>;
};

export type TriggerEventType =
  | "contact_added"
  | "voicemail_listened"
  | "email_opened"
  | "sms_replied"
  | "callback_received"
  | "tag_added"
  | "lead_inactive"
  | "engagement_score"
  | "manual"
  | "delivered"
  | "listened"
  | "clicked"
  | "opened"
  | "replied"
  | "callback"
  | "opt_out"
  | "blocked"
  | "failed"
  | "task_completed";

const EVENT_TO_TRIGGER: Partial<Record<TriggerEventType, string>> = {
  voicemail_listened: "voicemail_listened",
  email_opened: "email_opened",
  sms_replied: "sms_replied",
  callback_received: "callback_received",
  callback: "callback_received",
  opened: "email_opened",
  replied: "sms_replied",
  listened: "voicemail_listened",
};

export async function evaluateTriggers(params: {
  ownerId: string;
  contactId?: string;
  event: TriggerEventType;
  metadata?: Record<string, unknown>;
}) {
  const triggerType = EVENT_TO_TRIGGER[params.event] ?? params.event;

  const { data: rules } = await supabaseAdmin
    .from("automation_rules")
    .select("*")
    .eq("owner_id", params.ownerId)
    .eq("trigger_type", triggerType)
    .eq("enabled", true);

  if (!rules?.length) return [];

  const results: { ruleId: string; executed: number }[] = [];

  for (const rule of rules) {
    const actions = (rule.actions as AutomationAction[]) ?? [];
    const executed: AutomationAction[] = [];

    for (const action of actions) {
      try {
        await runAction(params.ownerId, params.contactId, action, {
          ...params.metadata,
          ruleId: rule.id,
        });
        executed.push(action);
      } catch (err) {
        console.warn("[automation] action failed:", err);
      }
    }

    await supabaseAdmin.from("automation_runs").insert({
      owner_id: params.ownerId,
      rule_id: rule.id,
      contact_id: params.contactId ?? null,
      status: "completed",
      actions_executed: executed,
    });

    await writeAuditLog({
      ownerId: params.ownerId,
      action: "AUTOMATION_TRIGGERED",
      entityType: "automation_rule",
      entityId: null,
      metadata: { ruleId: rule.id, triggerType, actions: executed.length },
    });

    results.push({ ruleId: rule.id, executed: executed.length });
  }

  return results;
}

async function runAction(
  ownerId: string,
  contactId: string | undefined,
  action: AutomationAction,
  metadata: Record<string, unknown> = {},
) {
  const ruleId = String(metadata.ruleId ?? "rule");

  switch (action.type) {
    case "notify_user":
      await writeAuditLog({
        ownerId,
        action: "AUTOMATION_NOTIFY",
        entityType: "notification",
        entityId: null,
        metadata: { message: action.config.message ?? "Automation triggered", contactId, ...metadata },
      });
      return;

    case "add_tag":
      await writeAuditLog({
        ownerId,
        action: "AUTOMATION_TAG_ADDED",
        entityType: "contact",
        entityId: contactId ?? null,
        metadata: { contactId, tag: action.config.tag },
      });
      return;

    case "assign_task":
      await writeAuditLog({
        ownerId,
        action: "AUTOMATION_TASK_ASSIGNED",
        entityType: "task",
        entityId: null,
        metadata: { contactId, title: action.config.title },
      });
      return;

    case "send_sms":
    case "send_email": {
      if (!contactId) return;
      const { data: contact } = await supabaseAdmin
        .from("contacts")
        .select("id, phone, email, dnc")
        .eq("id", contactId)
        .eq("owner_id", ownerId)
        .maybeSingle();

      if (!contact) return;
      if (contact.dnc) {
        await writeAuditLog({
          ownerId,
          action: "AUTOMATION_BLOCKED",
          entityType: "contact",
          entityId: contactId,
          metadata: { reason: "DNC", action: action.type },
        });
        return;
      }

      const channel = action.type === "send_email" ? "email" : "sms";
      const body =
        String(action.config.body ?? action.config.message ?? "") ||
        (channel === "email"
          ? "Following up — reply anytime if you have questions."
          : "Hi — just following up. Reply STOP to opt out.");

      const result = await sendToContact({
        ownerId,
        contact,
        channel,
        campaignId: `automation-${ruleId}`,
        recipientId: contactId,
        body,
        subject: String(action.config.subject ?? "Message from your agent"),
        recordEngagement: true,
      });

      await writeAuditLog({
        ownerId,
        action: `AUTOMATION_${action.type.toUpperCase()}`,
        entityType: "automation_action",
        entityId: contactId,
        metadata: {
          contactId,
          channel,
          ok: result.ok,
          status: result.status,
          error: result.error,
          providerMessageId: result.providerMessageId,
          ...action.config,
        },
      });
      return;
    }

    case "start_campaign": {
      const campaignId = String(action.config.campaignId ?? "");
      if (!campaignId || !contactId) return;
      const { enrollContacts, scheduleStepRunsForRecipients } = await import("@/lib/campaigns/enroll");
      const enrollment = await enrollContacts(ownerId, campaignId, { contactIds: [contactId] });
      if (enrollment.recipientIds.length) {
        const { data: campaign } = await supabaseAdmin
          .from("campaigns")
          .select("status")
          .eq("id", campaignId)
          .eq("owner_id", ownerId)
          .maybeSingle();
        if (campaign && ["queued", "sending", "partial", "sent"].includes(campaign.status)) {
          await scheduleStepRunsForRecipients(ownerId, campaignId, enrollment.recipientIds);
        }
      }
      await writeAuditLog({
        ownerId,
        action: "AUTOMATION_START_CAMPAIGN",
        entityType: "campaign",
        entityId: campaignId,
        metadata: { contactId, enrollment, ...metadata },
      });
      return;
    }

    case "trigger_ai_follow_up":
      await writeAuditLog({
        ownerId,
        action: "AUTOMATION_TRIGGER_AI_FOLLOW_UP",
        entityType: "automation_action",
        entityId: null,
        metadata: { contactId, ...action.config, ...metadata },
      });
      return;

    default:
      return;
  }
}
