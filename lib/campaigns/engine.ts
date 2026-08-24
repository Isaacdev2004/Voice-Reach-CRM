import { writeAuditLog } from "@/lib/audit";
import { syncCallbackStepToCalendar } from "@/lib/calendar/sync";
import {
  applyMergeFields,
  findUnresolvedMergeFields,
  splitEmailSubjectBody,
} from "@/lib/campaigns/merge-fields";
import { evaluateEligibility } from "@/lib/compliance";
import { isInQuietHours, nextQuietHoursEnd } from "@/lib/compliance/quiet-hours";
import { recordEngagementEvent } from "@/lib/engagement/record";
import { sendToContact } from "@/lib/providers/dispatch-message";
import { loadWorkspaceSettings } from "@/lib/settings/load-workspace";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { signVoiceAssetUrl, voiceAssetReady } from "@/lib/voice/signed-audio";

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
  const settingsCache = new Map<
    string,
    Awaited<ReturnType<typeof loadWorkspaceSettings>>
  >();

  async function workspaceFor(ownerId: string) {
    if (!settingsCache.has(ownerId)) {
      settingsCache.set(ownerId, await loadWorkspaceSettings(ownerId));
    }
    return settingsCache.get(ownerId)!;
  }

  for (const run of runs ?? []) {
    const step = run.campaign_steps;
    const recipient = run.campaign_recipients;
    const contact = recipient?.contacts;
    const campaignRaw = recipient?.campaigns;
    const campaign = Array.isArray(campaignRaw) ? campaignRaw[0] : campaignRaw;
    if (!step || !recipient || !contact) {
      await markRun(run.id, "skipped", { reason: "missing entity" });
      executed.push({ runId: run.id, status: "skipped" });
      continue;
    }

    const { workspace, profile } = await workspaceFor(run.owner_id);

    if (
      isInQuietHours({
        quietHoursStart: workspace.quietHoursStart,
        quietHoursEnd: workspace.quietHoursEnd,
        timeZone: profile.timezone,
      })
    ) {
      const resumeAt = nextQuietHoursEnd({
        quietHoursStart: workspace.quietHoursStart,
        quietHoursEnd: workspace.quietHoursEnd,
        timeZone: profile.timezone,
      });
      await supabaseAdmin
        .from("campaign_step_runs")
        .update({ scheduled_at: resumeAt.toISOString() })
        .eq("id", run.id);
      executed.push({ runId: run.id, status: "deferred_quiet_hours" });
      continue;
    }

    const eligibility = evaluateEligibility({
      phone: contact.phone,
      dnc: contact.dnc,
      opt_out_requested: contact.opt_out_requested,
      consent_records: contact.consent_records ?? [],
    });
    const issues = workspace.requireConsentProof
      ? eligibility.issues
      : eligibility.issues.filter((i) => i !== "Missing consent proof/reference");
    if (issues.length) {
      await markRun(run.id, "blocked", { issues });
      await supabaseAdmin
        .from("campaign_recipients")
        .update({ eligibility_status: "blocked", eligibility_issues: issues })
        .eq("id", recipient.id);
      executed.push({ runId: run.id, status: "blocked" });
      continue;
    }

    if (step.type === "wait") {
      await markRun(run.id, "sent", { channel: step.type });
      executed.push({ runId: run.id, status: "sent" });
      continue;
    }

    if (step.type === "task" || step.type === "callback") {
      const calendarSync = await syncCallbackStepToCalendar({
        ownerId: run.owner_id,
        contact,
        campaignId: campaign?.id,
        stepRunId: run.id,
        stepTitle: step.title,
        stepDescription: step.description,
        scheduledAt: run.scheduled_at,
        timeLabel: step.time_label,
        stepType: step.type,
      });

      await markRun(run.id, "sent", {
        channel: step.type,
        calendarSync: calendarSync.synced ? "created" : calendarSync.reason,
      });
      await recordEngagementEvent({
        ownerId: run.owner_id,
        contactId: contact.id,
        campaignId: campaign?.id,
        stepId: step.id,
        eventType: step.type === "task" ? "task_completed" : "delivered",
        channel: step.type === "callback" ? "callback" : "task",
        metadata: calendarSync.synced
          ? { calendarEventId: calendarSync.eventId }
          : { calendarSkipped: calendarSync.reason },
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

    // Campaign.provider is the voicemail adapter preference only.
    // SMS/email always use channel-aware picking (or mock when campaign is in mock/test mode).
    const preferredProvider =
      campaign?.provider === "mock"
        ? "mock"
        : channel === "voicemail"
          ? campaign?.provider || undefined
          : undefined;

    // Live campaigns must not silently mock SMS/email when credentials are missing.
    if (campaign?.provider !== "mock") {
      const liveProviders = (await import("@/lib/providers/registry")).isLiveProvidersConfigured();
      if (channel === "sms" && !liveProviders.sms) {
        await markRun(run.id, "failed", {
          error: "Twilio SMS is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.",
        });
        executed.push({ runId: run.id, status: "failed" });
        continue;
      }
      if (channel === "email" && !liveProviders.email) {
        await markRun(run.id, "failed", {
          error: "Resend email is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL.",
        });
        executed.push({ runId: run.id, status: "failed" });
        continue;
      }
      if (channel === "voicemail" && !liveProviders.voicemail) {
        await markRun(run.id, "failed", {
          error: "Slybroadcast is not configured for ringless voicemail.",
        });
        executed.push({ runId: run.id, status: "failed" });
        continue;
      }
    }

    let audioUrl: string | undefined;
    if (channel === "voicemail") {
      const voiceRaw = campaign?.voice_assets;
      const voiceAsset = Array.isArray(voiceRaw) ? voiceRaw[0] : voiceRaw;
      if (!voiceAssetReady(voiceAsset)) {
        await markRun(run.id, "failed", {
          error: "Campaign needs an approved voice recording before voicemail steps can send.",
        });
        executed.push({ runId: run.id, status: "failed" });
        continue;
      }
      audioUrl = (await signVoiceAssetUrl(voiceAsset)) ?? undefined;
      if (!audioUrl) {
        await markRun(run.id, "failed", { error: "Unable to sign voice recording URL." });
        executed.push({ runId: run.id, status: "failed" });
        continue;
      }
    }

    const mergeCtx = {
      contact: {
        first_name: contact.first_name,
        last_name: contact.last_name,
        phone: contact.phone,
        email: contact.email,
        notes: contact.notes,
        source: contact.source,
        type: contact.type,
        preferred_area: contact.preferred_area,
        property_address: contact.property_address,
        budget: contact.budget,
      },
      agentName: workspace.defaultSenderName || profile.fullName,
      agentPhone: profile.phone,
      brokerage: workspace.name,
      // Prefer contact area — never use industry label ("Real Estate") as a place name
      marketArea: contact.preferred_area || undefined,
      city: contact.preferred_area || undefined,
    };

    const mergedDescription = applyMergeFields(step.description ?? step.title ?? "", mergeCtx);
    const mergedTitle = applyMergeFields(step.title ?? "", mergeCtx);
    const emailParts =
      channel === "email" ? splitEmailSubjectBody(mergedDescription) : null;
    const outboundBody = emailParts?.body ?? mergedDescription;
    const outboundSubject = emailParts?.subject ?? mergedTitle;
    const unresolved = findUnresolvedMergeFields(
      `${outboundSubject ?? ""}\n${outboundBody ?? ""}`,
    );
    if (unresolved.length) {
      await markRun(run.id, "failed", {
        error: `Message still has unfilled merge fields: ${unresolved.join(", ")}. Edit the step copy or fill contact property/area before sending.`,
        unresolvedMergeFields: unresolved,
      });
      executed.push({ runId: run.id, status: "failed" });
      continue;
    }

    const sendResult = await sendToContact({
      ownerId: run.owner_id,
      contact: {
        id: contact.id,
        phone: contact.phone,
        email: contact.email,
      },
      channel,
      campaignId: campaign?.id ?? recipient.campaign_id,
      recipientId: recipient.id,
      stepId: step.id,
      body: outboundBody,
      subject: outboundSubject,
      audioUrl,
      providerId: preferredProvider,
      recordEngagement: true,
    });

    if (sendResult.skipped) {
      await markRun(run.id, "skipped", { reason: sendResult.skipReason });
      executed.push({ runId: run.id, status: "skipped" });
      continue;
    }

    if (sendResult.ok) {
      await markRun(run.id, "sent", {
        providerMessageId: sendResult.providerMessageId,
        status: sendResult.status,
        simulated: sendResult.status === "mock_sent",
      });
      await supabaseAdmin
        .from("campaign_recipients")
        .update({
          delivery_status:
            sendResult.status === "mock_sent"
              ? "mock_sent"
              : sendResult.status === "queued"
                ? "queued"
                : "sent",
          provider_message_id: sendResult.providerMessageId ?? null,
        })
        .eq("id", recipient.id);
    } else {
      await markRun(run.id, "failed", { error: sendResult.error });
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
