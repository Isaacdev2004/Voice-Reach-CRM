import { loadCalendarPreferences } from "@/lib/calendar/load-preferences";
import { getGoogleConnection, getGoogleEvent } from "@/lib/calendar/google";
import { wallTimeToInstant, zonedParts } from "@/lib/calendar/time";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ownedRows } from "@/lib/delivery/owned-rows";
import {
  appointmentSuggestion,
  timelinePage,
  type ActivityItem,
} from "./model";
import { relatedContactIds } from "@/lib/notes/workspace";
import { evidenceEnabled } from "@/lib/delivery/store";
import type { DeliveryMessage, DeliveryEvent } from "@/lib/delivery/types";
type Event = {
  id: string;
  title: string;
  external_event_id?: string;
  provider?: string;
  starts_at: string;
  created_at: string;
  metadata: Record<string, unknown>;
};
type Task = {
  id: string;
  title: string;
  due_at: string | null;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  calendar_event_id?: string;
};
type Audit = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};
export async function readContactActivity(
  owner: string,
  contact: string,
  cursor: string | null,
) {
  const found = await supabaseAdmin
    .from("contacts")
    .select("id")
    .eq("owner_id", owner)
    .eq("id", contact)
    .maybeSingle();
  if (found.error) throw Error("UNAVAILABLE");
  if (!found.data) throw Error("NOT_FOUND");
  const preferences = await loadCalendarPreferences(owner);
  const extra = { contact_id: contact };
  const [events, tasks, notes, enrollments, engagement, audits] =
    await Promise.all([
      ownedRows<Event>("calendar_events", "*", owner, undefined, extra),
      ownedRows<Task>("contact_tasks", "*", owner, undefined, extra),
      ownedRows<{
        id: string;
        title: string;
        body: string;
        created_at: string;
        updated_at?: string;
        kind: "note" | "strategy" | "goal";
        contact_id?: string;
        metadata?: unknown;
      }>("contact_notes", "*", owner),
      ownedRows<{
        id: string;
        campaign_id: string;
        created_at: string;
        delivery_status: string;
      }>("campaign_recipients", "*", owner, undefined, extra),
      ownedRows<{
        id: string;
        event_type: string;
        channel: string;
        occurred_at: string;
        campaign_id?: string;
        metadata: Record<string, unknown>;
      }>("engagement_events", "*", owner, undefined, extra),
      ownedRows<Audit>("audit_logs", "*", owner, undefined, {
        entity_type: "contact",
        entity_id: contact,
      }),
    ]);
  const items: ActivityItem[] = [];
  const limitations: string[] = [];
  const connection = events.some((e) => e.provider === "google")
    ? await getGoogleConnection(owner).catch(() => null)
    : null;
  const mirrors = new Set(
    tasks.map((t) => t.calendar_event_id).filter(Boolean),
  );
  for (const e of events) {
    if (mirrors.has(e.id) || mirrors.has(String(e.external_event_id))) continue;
    const meta = e.metadata ?? {};
    let title = e.title,
      scheduledAt = e.starts_at,
      detail =
        "Appointment record; the scheduled time does not establish attendance.",
      unverified = false;
    if (e.provider === "google") {
      try {
        if (!connection || !e.external_event_id) throw Error();
        const remote = await getGoogleEvent(
          connection,
          e.external_event_id,
          String(
            meta.externalCalendarId ?? connection.calendar_id ?? "primary",
          ),
        );
        if (!remote || remote.status === "cancelled") continue;
        title =
          remote.visibility === "private"
            ? "Busy"
            : (remote.summary ?? e.title);
        scheduledAt =
          remote.start?.dateTime ??
          (remote.start?.date
            ? wallTimeToInstant(
                remote.start.date,
                "00:00",
                String(remote.start?.timeZone ?? meta.timeZone ?? "UTC"),
                "earlier",
              )
            : e.starts_at);
        detail = Array.isArray(remote.recurrence)
          ? "Recurring provider series; open Calendar for individual occurrences. Attendance is not inferred."
          : "Verified provider appointment record; attendance is not inferred.";
      } catch {
        unverified = true;
        detail =
          "Stored external copy — current provider state could not be verified.";
        if (
          !limitations.includes(
            "External appointment verification is temporarily unavailable.",
          )
        )
          limitations.push(
            "External appointment verification is temporarily unavailable.",
          );
      }
    }
    items.push({
      id: "appointment:" + e.id,
      type:
        meta.kind === "callback"
          ? "callback"
          : meta.kind === "reminder"
            ? "reminder"
            : "appointment",
      title,
      at:
        typeof meta.outcomeRecordedAt === "string"
          ? meta.outcomeRecordedAt
          : e.created_at,
      scheduledAt,
      status: unverified
        ? "External copy — unverified"
        : meta.status === "completed"
          ? "Recorded completed"
          : meta.status === "missed"
            ? "Recorded missed"
            : "Scheduled",
      href: `/dashboard/calendar?date=${encodeURIComponent(zonedParts(scheduledAt, preferences.timezone).date)}`,
      detail,
      suggestion: unverified ? undefined : appointmentSuggestion(meta),
    });
  }
  for (const t of tasks)
    items.push({
      id: "task:" + t.id,
      type: "task",
      title: t.title,
      at: t.completed && t.completed_at ? t.completed_at : t.created_at,
      scheduledAt: t.due_at ?? undefined,
      status: t.completed
        ? t.completed_at
          ? "Completed"
          : "Completed (completion time not recorded)"
        : "Open",
      href: `/dashboard/contacts/${contact}`,
    });
  for (const n of notes.filter((n) => relatedContactIds(n).includes(contact)))
    items.push({
      id: "note:" + n.id,
      type: "note",
      title: n.title || "Contact note",
      at: n.updated_at ?? n.created_at,
      status: "Saved note",
      href: `/dashboard/notes?note=${n.id}`,
      detail: n.body.slice(0, 500),
    });
  const campaigns = await ownedRows<{
    id: string;
    name: string;
    status: string;
  }>("campaigns", "id, name, status", owner);
  const byCampaign = new Map(campaigns.map((c) => [c.id, c]));
  const validEnroll = enrollments.filter((e) => byCampaign.has(e.campaign_id));
  for (const e of validEnroll)
    items.push({
      id: "enrollment:" + e.id,
      type: "campaign",
      title: `Enrolled: ${byCampaign.get(e.campaign_id)!.name}`,
      at: e.created_at,
      status: e.delivery_status,
      href: `/dashboard/campaigns/${e.campaign_id}`,
    });
  // Runs are joined only through owned enrollment IDs and owned campaign IDs.
  const runs = (
    await Promise.all(
      validEnroll.map((e) =>
        ownedRows<{
          id: string;
          recipient_id: string;
          campaign_id: string;
          scheduled_at: string;
          executed_at: string | null;
          status: string;
          step_id: string;
        }>("campaign_step_runs", "*", owner, e.campaign_id, {
          recipient_id: e.id,
        }),
      ),
    )
  ).flat();
  const recipients = new Set(validEnroll.map((e) => e.id));
  for (const r of runs) {
    if (!recipients.has(r.recipient_id) || !byCampaign.has(r.campaign_id))
      continue;
    items.push({
      id: "sequence:" + r.id,
      type: "sequence",
      title: `Campaign sequence: ${byCampaign.get(r.campaign_id)!.name}`,
      at: r.executed_at ?? r.scheduled_at,
      status: r.status,
      scheduledAt: r.scheduled_at,
      href: `/dashboard/campaigns/${r.campaign_id}`,
      detail: r.executed_at
        ? "Recorded execution; this does not prove delivery."
        : "Scheduled sequence step; execution not recorded.",
    });
  }
  const steps = await ownedRows<{ id: string; campaign_id: string }>(
    "campaign_steps",
    "id, campaign_id",
    owner,
  );
  for (const enrollment of validEnroll) {
    const actualSteps = steps.filter(
      (s) => s.campaign_id === enrollment.campaign_id,
    );
    const completedRuns = runs.filter(
      (r) =>
        r.recipient_id === enrollment.id &&
        r.status === "sent" &&
        r.executed_at,
    );
    if (
      actualSteps.length &&
      actualSteps.every((s) => completedRuns.some((r) => r.step_id === s.id))
    ) {
      const last = [...completedRuns].sort((a, b) =>
        b.executed_at!.localeCompare(a.executed_at!),
      )[0];
      const existing = items.find((i) => i.id === "sequence:" + last.id);
      if (existing)
        existing.suggestion = {
          text: "All current sequence steps have recorded executions. Review engagement before choosing the next campaign; execution alone does not prove delivery.",
          action: "campaign",
        };
    }
  }
  const evidenceIds = new Set<string>();
  if (evidenceEnabled()) {
    try {
      const messages = await ownedRows<DeliveryMessage>(
        "outbound_messages",
        "*",
        owner,
        undefined,
        extra,
      );
      const delivery = await ownedRows<DeliveryEvent>(
        "outbound_delivery_events",
        "*",
        owner,
      );
      for (const m of messages) {
        if (m.provider_message_id) evidenceIds.add(m.provider_message_id);
        const records = delivery.filter((e) => e.message_id === m.id);
        items.push({
          id: "message:" + m.id,
          type: m.channel,
          title:
            m.subject ||
            `${m.channel === "voicemail" ? "Ringless voicemail" : m.channel.toUpperCase()} activity`,
          at: m.created_at,
          status: m.submission_status,
          detail:
            "Submission record; acceptance alone does not establish delivery.",
        });
        for (const e of records)
          items.push({
            id: "delivery:" + e.id,
            type: m.channel,
            title: `${m.channel.toUpperCase()}: ${e.event_type}`,
            at: e.occurred_at ?? e.received_at,
            status: e.event_type,
            detail: e.occurred_at
              ? "Provider event timestamp"
              : "Provider timestamp unavailable; receipt time shown",
          });
      }
    } catch {
      limitations.push("Delivery evidence is temporarily unavailable.");
    }
  } else
    limitations.push(
      "Historical engagement is recorded activity, not verified delivery evidence.",
    );
  for (const e of engagement) {
    const reference = String(e.metadata?.provider_message_id ?? "");
    if (reference && evidenceIds.has(reference)) continue;
    items.push({
      id: "engagement:" + e.id,
      type: e.channel || "communication",
      title: `Recorded ${e.channel || "engagement"}: ${e.event_type}`,
      at: e.occurred_at,
      status: "Historical recorded event",
      href:
        e.campaign_id && byCampaign.has(e.campaign_id)
          ? `/dashboard/campaigns/${e.campaign_id}`
          : undefined,
    });
  }
  for (const a of audits) {
    if (!(a.entity_type === "contact" && a.entity_id === contact)) continue;
    if (a.action === "CALL_LOGGED") {
      items.push({
        id: "call:" + a.id,
        type: "call",
        title: "Manually logged call",
        at: a.created_at,
        status: String(a.metadata.outcome ?? "Recorded"),
        detail:
          typeof a.metadata.notes === "string" ? a.metadata.notes : undefined,
      });
    } else if (a.action === "FINANCING_REPORT_SAVED") {
      items.push({
        id: "financing:" + a.id,
        type: "update",
        title: "Financing estimate saved",
        at: a.created_at,
        status: "Saved",
        detail:
          typeof a.metadata.title === "string" ? a.metadata.title : undefined,
        href: "/dashboard/mortgage?contactId=" + encodeURIComponent(contact),
      });
    } else if (a.action === "CONTACT_UPDATED") {
      const fields = Array.isArray(a.metadata.fields) ? a.metadata.fields : [];
      items.push({
        id: "update:" + a.id,
        type: fields.some(
          (f) =>
            typeof f === "string" &&
            /preferred_|budget|property_address/.test(f),
        )
          ? "property"
          : "update",
        title: fields.some(
          (f) =>
            typeof f === "string" &&
            /preferred_|budget|property_address/.test(f),
        )
          ? "Saved property preferences updated"
          : "Contact updated",
        at: a.created_at,
        status: "Recorded change",
        detail: fields.filter((f) => typeof f === "string").join(", "),
        href: `/dashboard/contacts/${contact}`,
      });
    }
  }
  return {
    ...timelinePage(items, cursor),
    limitations,
    timezone: preferences.timezone,
  };
}
