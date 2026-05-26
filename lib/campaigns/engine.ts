import { writeAuditLog } from "@/lib/audit";
import { evaluateEligibility } from "@/lib/compliance";
import { recordEngagementEvent } from "@/lib/engagement/record";
import { dispatch } from "@/lib/providers/registry";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type CampaignStepType =
  | "voicemail"
  | "sms"
  | "email"
  | "avatar_video"
  | "task"
  | "callback"
  | "wait";

export type CampaignBlueprintStep = {
  id: string;
  order: number;
  type: CampaignStepType;
  title: string;
  description?: string;
  delayMinutes?: number;
  dayLabel?: string;
  timeLabel?: string;
  conditions?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

export async function persistSteps(
  ownerId: string,
  campaignId: string,
  steps: CampaignBlueprintStep[],
) {
  await supabaseAdmin.from("campaign_steps").delete().eq("campaign_id", campaignId);
  if (!steps.length) return [];

  const rows = steps.map((step) => ({
    owner_id: ownerId,
    campaign_id: campaignId,
    step_order: step.order,
    type: step.type,
    title: step.title,
    description: step.description ?? "",
    delay_minutes: step.delayMinutes ?? 0,
    day_label: step.dayLabel ?? null,
    time_label: step.timeLabel ?? null,
    conditions: step.conditions ?? {},
    status: "active",
  }));

  const { data, error } = await supabaseAdmin
    .from("campaign_steps")
    .insert(rows)
    .select("*");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function scheduleStepRunsForCampaign(ownerId: string, campaignId: string) {
  const [{ data: steps }, { data: recipients }] = await Promise.all([
    supabaseAdmin
      .from("campaign_steps")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("step_order", { ascending: true }),
    supabaseAdmin
      .from("campaign_recipients")
      .select("id, eligibility_status")
      .eq("campaign_id", campaignId)
      .eq("eligibility_status", "eligible"),
  ]);

  if (!steps?.length || !recipients?.length) return { scheduled: 0 };

  const baseTime = Date.now();
  const rows: Record<string, unknown>[] = [];
  for (const recipient of recipients) {
    let cursor = baseTime;
    for (const step of steps) {
      cursor += (step.delay_minutes ?? 0) * 60_000;
      rows.push({
        owner_id: ownerId,
        campaign_id: campaignId,
        step_id: step.id,
        recipient_id: recipient.id,
        scheduled_at: new Date(cursor).toISOString(),
        status: "scheduled",
      });
    }
  }

  if (!rows.length) return { scheduled: 0 };

  const { error } = await supabaseAdmin.from("campaign_step_runs").insert(rows);
  if (error) throw new Error(error.message);

  return { scheduled: rows.length };
}

/**
 * Worker: executes step runs whose scheduled_at has passed.
 * In production this is called from a cron (Vercel Cron / Supabase Edge / external scheduler).
 */
export async function runDueStepRuns(options: { ownerId?: string; limit?: number } = {}) {
  const limit = options.limit ?? 25;
  let query = supabaseAdmin
    .from("campaign_step_runs")
    .select(
      "*, campaign_steps(*), campaign_recipients(*, contacts(*, consent_records(*)), campaigns(provider, voice_asset_id, voice_assets(*)))",
    )
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (options.ownerId) query = query.eq("owner_id", options.ownerId);

  const { data: runs, error } = await query;
  if (error) throw new Error(error.message);

  const executed: { runId: string; status: string }[] = [];

  for (const run of runs ?? []) {
    const step = run.campaign_steps;
    const recipient = run.campaign_recipients;
    const contact = recipient?.contacts;
    const campaign = recipient?.campaigns;
    if (!step || !recipient || !contact) {
      await markRun(run.id, "skipped", { reason: "missing entity" });
      executed.push({ runId: run.id, status: "skipped" });
      continue;
    }

    const eligibility = evaluateEligibility({
      phone: contact.phone,
      dnc: contact.dnc,
      consent_records: contact.consent_records ?? [],
    });
    if (!eligibility.eligible) {
      await markRun(run.id, "blocked", { issues: eligibility.issues });
      await supabaseAdmin
        .from("campaign_recipients")
        .update({ eligibility_status: "blocked", eligibility_issues: eligibility.issues })
        .eq("id", recipient.id);
      executed.push({ runId: run.id, status: "blocked" });
      continue;
    }

    if (step.type === "wait" || step.type === "task" || step.type === "callback") {
      await markRun(run.id, "sent", { channel: step.type });
      await recordEngagementEvent({
        ownerId: run.owner_id,
        contactId: contact.id,
        campaignId: campaign?.id,
        stepId: step.id,
        eventType: step.type === "task" ? "task_completed" : "delivered",
        channel: step.type === "callback" ? "callback" : "task",
      });
      executed.push({ runId: run.id, status: "sent" });
      continue;
    }

    if (step.type === "avatar_video") {
      await markRun(run.id, "sent", { channel: "video", note: "AI video placeholder" });
      await recordEngagementEvent({
        ownerId: run.owner_id,
        contactId: contact.id,
        campaignId: campaign?.id,
        stepId: step.id,
        eventType: "delivered",
        channel: "video",
      });
      executed.push({ runId: run.id, status: "sent" });
      continue;
    }

    const channel: "voicemail" | "sms" | "email" =
      step.type === "voicemail" ? "voicemail" : step.type === "sms" ? "sms" : "email";

    const sendResult = await dispatch(
      {
        channel,
        to: contact.phone,
        from: process.env.VOICE_PROVIDER_FROM_NUMBER,
        audioUrl: campaign?.voice_assets?.audio_url ?? undefined,
        body: step.description ?? step.title,
        subject: step.title,
        campaignId: campaign?.id ?? recipient.campaign_id,
        recipientId: recipient.id,
        stepId: step.id,
      },
      campaign?.provider,
    );

    if (sendResult.ok) {
      await markRun(run.id, "sent", { providerMessageId: sendResult.providerMessageId });
      await supabaseAdmin
        .from("campaign_recipients")
        .update({
          delivery_status: sendResult.status === "queued" ? "queued" : "sent",
          provider_message_id: sendResult.providerMessageId ?? null,
        })
        .eq("id", recipient.id);
      await recordEngagementEvent({
        ownerId: run.owner_id,
        contactId: contact.id,
        campaignId: campaign?.id,
        stepId: step.id,
        eventType: "delivered",
        channel,
      });
    } else {
      await markRun(run.id, "failed", { error: sendResult.error });
      await recordEngagementEvent({
        ownerId: run.owner_id,
        contactId: contact.id,
        campaignId: campaign?.id,
        stepId: step.id,
        eventType: "failed",
        channel,
        metadata: { error: sendResult.error },
      });
    }
    executed.push({ runId: run.id, status: sendResult.ok ? "sent" : "failed" });
  }

  await writeAuditLog({
    ownerId: options.ownerId ?? "system",
    action: "CAMPAIGN_RUNNER_TICK",
    entityType: "campaign_step_run",
    entityId: null,
    metadata: { processed: executed.length },
  }).catch(() => undefined);

  return { processed: executed.length, executed };
}

async function markRun(
  id: string,
  status: "running" | "sent" | "skipped" | "failed" | "blocked",
  result: Record<string, unknown>,
) {
  await supabaseAdmin
    .from("campaign_step_runs")
    .update({ status, executed_at: new Date().toISOString(), result })
    .eq("id", id);
}
