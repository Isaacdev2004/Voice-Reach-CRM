import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { readContactSnapshot } from "@/lib/contacts/read-snapshot";
import { readDelivery } from "@/lib/delivery/store";
import { contactSegment } from "@/lib/contacts/lifecycle";
import { zonedParts } from "@/lib/calendar/time";
import {
  summarizeCall,
  sharedReceiver,
  type CallEvent,
} from "@/lib/communications/safety";
import {
  orderedPriorities,
  type BriefingPreferences,
  type Priority,
  type Snapshot,
} from "./model";
import type { TaskRecord, TaskTransaction } from "@/lib/tasks/workspace-model";
async function recent<T>(
  owner: string,
  table: string,
  column: string,
  since: string,
  ascending = true,
): Promise<T[]> {
  const r = await supabaseAdmin
    .from(table)
    .select("*")
    .eq("owner_id", owner)
    .gte(column, since)
    .order(column, { ascending })
    .order("id", { ascending: true })
    .limit(201);
  if (r.error || (r.data?.length ?? 0) > 200)
    throw Error("Source unavailable or window exceeded");
  return (r.data ?? []) as T[];
}
type Inbound = {
  id: string;
  provider_id: string;
  kind: string;
  contact_id: string | null;
  to_number: string;
  status: string;
  classification: string;
  received_at: string;
};
type Appointment = {
  id: string;
  contact_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  metadata?: Record<string, unknown>;
};
export async function buildPriorities(
  owner: string,
  p: BriefingPreferences,
  since: string | null,
  now = new Date(),
): Promise<Snapshot> {
  const today = zonedParts(now, p.timezone).date,
    lookback = new Date(+now - 30 * 86400000).toISOString();
  const items: Priority[] = [],
    limitations = [
      "Recorded activity from the last 30 days; older overdue work may require review in Tasks.",
    ];
  const contacts = await readContactSnapshot(supabaseAdmin, owner);
  const names = new Map(
    contacts.map((c) => [
      c.id,
      [c.first_name, c.last_name].filter(Boolean).join(" "),
    ]),
  );
  const [
    tasks,
    events,
    inbound,
    transactions,
    delivery,
    numbers,
    campaigns,
    callEvidence,
  ] = await Promise.allSettled([
    recent<TaskRecord>(owner, "contact_tasks", "due_at", lookback),
    recent<Appointment>(owner, "calendar_events", "starts_at", lookback),
    recent<Inbound>(
      owner,
      "inbound_communications",
      "received_at",
      lookback,
      false,
    ),
    recent<TaskTransaction>(
      owner,
      "task_transactions",
      "created_at",
      new Date(0).toISOString(),
      false,
    ),
    readDelivery(owner),
    supabaseAdmin
      .from("subscriber_phone_numbers")
      .select("phone")
      .eq("owner_id", owner)
      .eq("verified", true)
      .limit(201),
    supabaseAdmin
      .from("campaigns")
      .select("id")
      .eq("owner_id", owner)
      .limit(1001),
    supabaseAdmin
      .from("audit_logs")
      .select("entity_id, metadata")
      .eq("owner_id", owner)
      .eq("action", "TWILIO_CALL_EVENT")
      .gte("created_at", lookback)
      .order("created_at", { ascending: false })
      .limit(201),
  ]);
  const add = (i: Priority) => {
    if (
      Number.isFinite(Date.parse(i.at)) &&
      Date.parse(i.at) <= +now + 7 * 86400000
    )
      items.push(i);
  };
  if (tasks.status === "fulfilled")
    for (const t of tasks.value) {
      if (
        t.completed ||
        !t.due_at ||
        !names.has(t.contact_id) ||
        zonedParts(t.due_at, p.timezone).date > today
      )
        continue;
      const overdue = Date.parse(t.due_at) < +now;
      add({
        id: `task:${t.id}`,
        category: "tasks",
        title: t.title,
        at: t.due_at,
        observedAt: t.created_at,
        rank: overdue ? 0 : 2,
        reason: overdue
          ? "An open task is past its recorded deadline."
          : "An open task is due today.",
        href: `/dashboard/tasks?taskId=${t.id}`,
        contactId: t.contact_id,
      });
    }
  else limitations.push("Tasks could not be verified.");
  if (events.status === "fulfilled")
    for (const e of events.value) {
      if (
        !e.contact_id ||
        !names.has(e.contact_id) ||
        ["cancelled", "canceled"].includes(String(e.metadata?.status))
      )
        continue;
      if (
        +new Date(e.starts_at) >= +now &&
        zonedParts(e.starts_at, p.timezone).date <= today
      )
        add({
          id: `appointment:${e.id}`,
          category: "appointments",
          title: e.title,
          at: e.starts_at,
          rank: 1,
          reason: "A recorded client appointment is scheduled for today.",
          href: `/dashboard/calendar?date=${today}`,
          contactId: e.contact_id,
        });
      else if (
        e.metadata?.status === "completed" &&
        e.metadata?.appointmentType === "showing" &&
        +new Date(e.ends_at) <= +now &&
        +new Date(e.ends_at) >= +now - 7 * 86400000
      )
        add({
          id: `showing:${e.id}`,
          category: "activity",
          title: "Review completed showing",
          at: e.ends_at,
          observedAt: e.ends_at,
          rank: 6,
          reason:
            "A showing was marked completed. Review the contact before deciding whether to follow up.",
          href: `/dashboard/contacts/${e.contact_id}`,
          contactId: e.contact_id,
        });
    }
  else limitations.push("Appointments could not be verified.");
  if (transactions.status === "fulfilled")
    for (const t of transactions.value) {
      const date = t.payload?.closingDate;
      if (
        !date ||
        !names.has(t.contact_id) ||
        t.payload.cancelled ||
        ["closed", "completed"].includes(t.payload.stage ?? "")
      )
        continue;
      if (date > zonedParts(new Date(+now + 7 * 86400000), p.timezone).date)
        continue;
      const taskIds = Array.isArray(t.payload.taskIds) ? t.payload.taskIds : [],
        related =
          tasks.status === "fulfilled"
            ? tasks.value.filter((task) => taskIds.includes(task.id))
            : [];
      if (
        taskIds.length &&
        related.length === taskIds.length &&
        related.every((task) => task.completed)
      )
        continue;
      add({
        id: `transaction:${t.id}`,
        category: "transactions",
        title: t.payload.name,
        at: date + "T12:00:00Z",
        observedAt: t.created_at,
        rank: date < today ? 0 : 4,
        reason:
          date < today
            ? "The recorded expected closing date has passed; verify transaction progress."
            : "The recorded expected closing date is within seven days.",
        href: `/dashboard/tasks?tab=checklists&contactId=${t.contact_id}`,
        contactId: t.contact_id,
      });
    }
  else limitations.push("Transaction milestones could not be verified.");
  const evidence =
    delivery.status === "fulfilled" ? delivery.value.records : null;
  if (!evidence)
    limitations.push(
      "Delivery receipts and response correlation could not be verified.",
    );
  const callRecords =
    callEvidence.status === "fulfilled" &&
    !callEvidence.value.error &&
    (callEvidence.value.data?.length ?? 0) <= 200
      ? (callEvidence.value.data ?? [])
      : null;
  if (!callRecords)
    limitations.push(
      "Call-leg evidence could not be verified; human answers are never inferred.",
    );
  if (
    inbound.status === "fulfilled" &&
    numbers.status === "fulfilled" &&
    !numbers.value.error &&
    (numbers.value.data?.length ?? 0) <= 200
  ) {
    const verified = new Set((numbers.value.data ?? []).map((n) => n.phone));
    if ([...verified].some((phone) => sharedReceiver(phone)))
      limitations.push(
        "Shared-number inbound records are not treated as subscriber-attributed. Routing review is required.",
      );
    if (!verified.size)
      limitations.push(
        "No verified connected Twilio numbers are available. Personal cellphone activity is not tracked.",
      );
    const seen = new Set<string>(),
      contacted = new Set<string>();
    for (const i of inbound.value) {
      if (
        sharedReceiver(i.to_number) ||
        !i.contact_id ||
        !names.has(i.contact_id) ||
        !verified.has(i.to_number) ||
        +new Date(i.received_at) > +now
      )
        continue;
      const key = `${i.kind}:${i.provider_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (i.kind === "sms" && !contacted.has(i.contact_id)) {
        contacted.add(i.contact_id);
        if (["Opt-out", "Not interested"].includes(i.classification)) continue;
        if (
          evidence?.some(
            (r) =>
              r.provider !== "mock" &&
              !r.campaign_id &&
              r.channel === "sms" &&
              r.contact_id === i.contact_id &&
              r.events.some(
                (e) =>
                  e.event_type === "sent" &&
                  Date.parse(e.occurred_at ?? e.received_at) >
                    Date.parse(i.received_at),
              ),
          )
        )
          continue;
        add({
          id: `reply:${i.id}`,
          category: "replies",
          title: "Review inbound lead reply",
          at: i.received_at,
          observedAt: i.received_at,
          rank: 3,
          reason: evidence
            ? "A Twilio SMS reply has no later direct provider-confirmed SMS response in the available records. Other channels may not be tracked."
            : "A Twilio SMS reply is recorded; response status is unavailable.",
          href: `/dashboard/contacts/${i.contact_id}`,
          contactId: i.contact_id,
        });
      } else if (i.kind === "call") {
        const leg = (callRecords ?? [])
          .filter(
            (e) =>
              e.entity_id === i.contact_id &&
              (e.metadata.sid === i.provider_id ||
                e.metadata.parentSid === i.provider_id),
          )
          .map((e) => e.metadata as CallEvent);
        const outcome = summarizeCall(leg);
        if (
          outcome.forwardedConnected ||
          (outcome.connected && !outcome.forwardingMissed) ||
          !(["no-answer", "busy"].includes(i.status) || outcome.missed)
        )
          continue;
        add({
          id: `call:${i.id}`,
          category: "calls",
          title: "Review missed Twilio call",
          at: i.received_at,
          observedAt: i.received_at,
          rank: 3,
          reason:
            "Twilio recorded a missed call leg on a verified connected number. Personal cellphone calls are not tracked.",
          href: `/dashboard/contacts/${i.contact_id}`,
          contactId: i.contact_id,
        });
      }
    }
  } else
    limitations.push(
      "Connected-number replies and missed calls could not be verified.",
    );
  const ownedCampaigns =
    campaigns.status === "fulfilled" &&
    !campaigns.value.error &&
    (campaigns.value.data?.length ?? 0) <= 1000
      ? new Set((campaigns.value.data ?? []).map((c) => c.id))
      : null;
  if (!ownedCampaigns)
    limitations.push("Campaign associations could not be verified.");
  const failureTypes = ["failed", "undelivered", "bounced", "rejected"],
    seenFailures = new Set<string>();
  for (const r of evidence ?? []) {
    if (
      r.provider === "mock" ||
      !r.failure ||
      !failureTypes.includes(r.status) ||
      !r.events.some((e) => failureTypes.includes(e.event_type)) ||
      !r.campaign_id ||
      !ownedCampaigns?.has(r.campaign_id) ||
      +new Date(r.created_at) < +new Date(lookback) ||
      seenFailures.has(r.logical_key)
    )
      continue;
    seenFailures.add(r.logical_key);
    add({
      id: `delivery:${r.id}`,
      category: "delivery",
      title: "Review campaign delivery failure",
      at: r.created_at,
      observedAt: r.created_at,
      rank: 5,
      reason:
        "A provider-confirmed delivery failure is recorded. Review the receipt before retrying.",
      href: "/dashboard/delivery",
      campaignId: r.campaign_id,
      ...(r.contact_id && names.has(r.contact_id)
        ? { contactId: r.contact_id }
        : {}),
    });
  }
  if (inbound.status === "fulfilled" && evidence)
    for (const c of contacts) {
      if (
        contactSegment(c.type) !== "active-lead" ||
        c.dnc ||
        c.opt_out_requested ||
        !c.last_contacted
      )
        continue;
      const last = Date.parse(c.last_contacted);
      if (!Number.isFinite(last) || last > +now - 14 * 86400000) continue;
      if (
        inbound.value.some(
          (i) => i.contact_id === c.id && Date.parse(i.received_at) > last,
        ) ||
        evidence.some(
          (r) => r.contact_id === c.id && Date.parse(r.created_at) > last,
        )
      )
        continue;
      add({
        id: `followup:${c.id}`,
        category: "activity",
        title: "Review follow-up timing",
        at: new Date(last).toISOString(),
        rank: 7,
        reason:
          "The recorded last-contact date is over 14 days old. Review newer conversations before deciding whether to reach out.",
        href: `/dashboard/contacts/${c.id}`,
        contactId: c.id,
      });
    }
  const unique = [...new Map(items.map((i) => [i.id, i])).values()].map(
    (i) => ({
      ...i,
      ...(i.contactId ? { contactName: names.get(i.contactId) } : {}),
    }),
  );
  const ordered = orderedPriorities(unique, p);
  return {
    items: ordered,
    total: ordered.length,
    counts: Object.fromEntries(
      p.categories.map((c) => [
        c,
        ordered.filter((i) => i.category === c).length,
      ]),
    ),
    limitations,
    updatedAt: now.toISOString(),
    since,
  };
}
