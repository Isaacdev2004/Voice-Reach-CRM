import { createHash } from "node:crypto";
import { loadWorkspaceSettings } from "@/lib/settings/load-workspace";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  createGoogleCalendarEvent,
  getGoogleConnection,
  getGoogleEvent,
  type Recurrence,
} from "./google";
type ContactLite = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
};
export async function syncCallbackStepToCalendar(options: {
  ownerId: string;
  contact: ContactLite;
  campaignId?: string | null;
  stepRunId?: string | null;
  taskId?: string;
  stepTitle?: string;
  stepDescription?: string;
  scheduledAt?: string | null;
  timeLabel?: string | null;
  stepType?: "callback" | "task";
  recurrence?: Recurrence;
}): Promise<{ synced: boolean; eventId?: string; reason?: string }> {
  try {
    const connection = await getGoogleConnection(options.ownerId);
    if (!connection) return { synced: false, reason: "no_calendar_connection" };
    if (options.campaignId) {
      const campaign = await supabaseAdmin
        .from("campaigns")
        .select("id")
        .eq("owner_id", options.ownerId)
        .eq("id", options.campaignId)
        .maybeSingle();
      if (campaign.error || !campaign.data)
        return { synced: false, reason: "campaign_unavailable" };
    }
    const contact = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("owner_id", options.ownerId)
      .eq("id", options.contact.id)
      .maybeSingle();
    if (contact.error || !contact.data)
      return { synced: false, reason: "contact_unavailable" };
    if (options.stepRunId) {
      const run = await supabaseAdmin
        .from("campaign_step_runs")
        .select("id, campaign_id, recipient_id")
        .eq("owner_id", options.ownerId)
        .eq("id", options.stepRunId)
        .maybeSingle();
      if (run.error || !run.data || run.data.campaign_id !== options.campaignId)
        return { synced: false, reason: "sequence_unavailable" };
      const recipient = await supabaseAdmin
        .from("campaign_recipients")
        .select("id")
        .eq("owner_id", options.ownerId)
        .eq("id", run.data.recipient_id)
        .eq("contact_id", options.contact.id)
        .eq("campaign_id", run.data.campaign_id)
        .maybeSingle();
      if (recipient.error || !recipient.data)
        return { synced: false, reason: "sequence_unavailable" };
    }
    if (options.taskId) {
      const task = await supabaseAdmin
        .from("contact_tasks")
        .select("id")
        .eq("owner_id", options.ownerId)
        .eq("id", options.taskId)
        .eq("contact_id", options.contact.id)
        .maybeSingle();
      if (task.error || !task.data)
        return { synced: false, reason: "task_unavailable" };
    }
    if (options.stepRunId || options.taskId) {
      let q = supabaseAdmin
        .from("calendar_events")
        .select("*")
        .eq("owner_id", options.ownerId);
      q = options.stepRunId
        ? q.eq("step_run_id", options.stepRunId)
        : q.eq("metadata->>taskId", options.taskId!);
      const existing = await q.maybeSingle();
      if (existing.error)
        return { synced: false, reason: "calendar_copy_needs_review" };
      if (existing.data) {
        const external = await getGoogleEvent(
          connection,
          existing.data.external_event_id,
        );
        return external && external.status !== "cancelled"
          ? { synced: true, eventId: existing.data.external_event_id }
          : { synced: false, reason: "calendar_event_removed_needs_review" };
      }
    }
    const localId = options.stepRunId ?? options.taskId ?? crypto.randomUUID();
    const providerId = createHash("sha256")
      .update(
        `${options.ownerId}:${options.stepRunId ? "run" : options.taskId ? "task" : "manual"}:${localId}`,
      )
      .digest("hex");
    const timeZone = (await loadWorkspaceSettings(options.ownerId)).profile
      .timezone;
    const start = options.scheduledAt
        ? new Date(options.scheduledAt)
        : new Date(),
      end = new Date(+start + 30 * 60000);
    if (!Number.isFinite(+start))
      return { synced: false, reason: "invalid_schedule" };
    const name =
      [options.contact.first_name, options.contact.last_name]
        .filter(Boolean)
        .join(" ") || "Contact";
    const title =
      options.stepType === "task"
        ? `Task: ${options.stepTitle ?? name}`
        : `Callback: ${name}`;
    const description = [
      options.stepDescription,
      options.contact.phone ? `Phone: ${options.contact.phone}` : null,
      options.contact.email ? `Email: ${options.contact.email}` : null,
      "Created by MyARI",
    ]
      .filter(Boolean)
      .join("\n");
    const created = await createGoogleCalendarEvent({
      connection,
      title,
      description,
      start,
      end,
      timeZone,
      recurrence: options.recurrence ?? "none",
      eventId: providerId,
      localId,
    });
    const saved = await supabaseAdmin
      .from("calendar_events")
      .upsert(
        {
          id: localId,
          owner_id: options.ownerId,
          contact_id: options.contact.id,
          campaign_id: options.campaignId ?? null,
          step_run_id: options.stepRunId ?? null,
          external_event_id: created.eventId,
          provider: "google",
          title,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          metadata: {
            htmlLink: created.htmlLink,
            etag: created.etag,
            externalCalendarId: connection.calendar_id,
            description,
            version: crypto.randomUUID(),
            timeZone,
            stepType: options.stepType,
            taskId: options.taskId,
            recurrence: options.recurrence ?? "none",
            syncState: "synced",
          },
        },
        { onConflict: "owner_id,provider,external_event_id" },
      );
    if (saved.error)
      return {
        synced: false,
        reason: "external_event_saved_local_copy_needs_review",
      };
    await writeAuditLog({
      ownerId: options.ownerId,
      action: "CALENDAR_EVENT_CREATED",
      entityType: "calendar_event",
      entityId: localId,
      metadata: {
        contactId: options.contact.id,
        campaignId: options.campaignId,
        title,
        startsAt: start.toISOString(),
      },
    }).catch(() => undefined);
    return { synced: true, eventId: created.eventId };
  } catch (e) {
    return {
      synced: false,
      reason:
        e instanceof Error && e.message === "GOOGLE_RECONNECT_REQUIRED"
          ? "calendar_reconnect_required"
          : "calendar_sync_failed",
    };
  }
}
