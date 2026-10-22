import { loadWorkspaceSettings } from "@/lib/settings/load-workspace";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  createGoogleCalendarEvent,
  getGoogleConnection,
  type Recurrence,
} from "./google";

type ContactLite = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
};

function contactName(contact: ContactLite): string {
  return (
    `${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim() || "Contact"
  );
}

async function getUserTimezone(ownerId: string): Promise<string> {
  return (await loadWorkspaceSettings(ownerId)).profile.timezone;
}

function eventWindowFromStep(options: {
  scheduledAt?: string | null;
  timeLabel?: string | null;
  timeZone: string;
  durationMinutes?: number;
}): { start: Date; end: Date } {
  const duration = options.durationMinutes ?? 30;
  const base = options.scheduledAt ? new Date(options.scheduledAt) : new Date();

  // The campaign scheduler has already resolved this exact instant in the workspace zone.
  const start = new Date(base);
  const end = new Date(start.getTime() + duration * 60_000);
  return { start, end };
}

export async function syncCallbackStepToCalendar(options: {
  ownerId: string;
  contact: ContactLite;
  campaignId?: string | null;
  stepRunId?: string | null;
  stepTitle?: string;
  stepDescription?: string;
  scheduledAt?: string | null;
  timeLabel?: string | null;
  stepType?: "callback" | "task";
  recurrence?: Recurrence;
}): Promise<{ synced: boolean; eventId?: string; reason?: string }> {
  const connection = await getGoogleConnection(options.ownerId);
  if (!connection) {
    return { synced: false, reason: "no_calendar_connection" };
  }

  const timeZone = await getUserTimezone(options.ownerId);
  const { start, end } = eventWindowFromStep({
    scheduledAt: options.scheduledAt,
    timeLabel: options.timeLabel,
    timeZone,
  });

  const name = contactName(options.contact);
  const title =
    options.stepType === "task"
      ? `Task: ${options.stepTitle ?? name}`
      : `Callback: ${name}`;

  const description = [
    options.stepDescription,
    options.contact.phone ? `Phone: ${options.contact.phone}` : null,
    options.contact.email ? `Email: ${options.contact.email}` : null,
    "Created by ARI",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const created = await createGoogleCalendarEvent({
      connection,
      title,
      description,
      start,
      end,
      timeZone,
      recurrence: options.recurrence ?? "none",
    });

    await supabaseAdmin.from("calendar_events").upsert(
      {
        owner_id: options.ownerId,
        contact_id: options.contact.id,
        campaign_id: options.campaignId ?? null,
        step_run_id: options.stepRunId ?? null,
        external_event_id: created.eventId,
        provider: "google",
        title,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        metadata: { htmlLink: created.htmlLink, stepType: options.stepType },
      },
      { onConflict: "owner_id,provider,external_event_id" },
    );

    await writeAuditLog({
      ownerId: options.ownerId,
      action: "CALENDAR_EVENT_CREATED",
      entityType: "calendar_event",
      entityId: created.eventId,
      metadata: {
        contactId: options.contact.id,
        campaignId: options.campaignId,
        title,
        startsAt: start.toISOString(),
      },
    }).catch(() => undefined);

    return { synced: true, eventId: created.eventId };
  } catch (err) {
    return {
      synced: false,
      reason: err instanceof Error ? err.message : "calendar_sync_failed",
    };
  }
}
