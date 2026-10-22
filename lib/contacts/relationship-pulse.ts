import { contactSegment } from "@/lib/contacts/lifecycle";

export type PulseLaneId = "needs_attention" | "heating_up" | "ready_for_business";

export type PulseContactPreview = {
  contactId: string;
  name: string;
  reason: string;
};

export type PulseLane = {
  id: PulseLaneId;
  title: string;
  subtitle: string;
  contacts: PulseContactPreview[];
};

export type RelationshipPulseResult = {
  lanes: PulseLane[];
  /** Short concierge-style nudge (rule-based, not LLM). */
  conciergeHint: string;
  generatedAt: string;
};

export type PulseContactInput = {
  id: string;
  first_name: string;
  last_name?: string | null;
  type?: string | null;
  dnc?: boolean;
  budget?: number | string | null;
  created_at?: string;
  updated_at?: string;
  consent_status?: string | null;
};

export type PulseTaskInput = {
  contact_id: string | null;
  due_at: string | null;
  completed: boolean;
};

export type PulseEngagementInput = {
  contact_id: string | null;
  event_type: string;
  occurred_at: string;
  score?: number | null;
};

const MS_DAY = 24 * 60 * 60 * 1000;
const HEATING_EVENTS = new Set(["replied", "opened", "clicked", "listened", "callback"]);
const HIGH_INTENT = new Set(["replied", "callback", "task_completed"]);

function displayName(c: PulseContactInput): string {
  return `${c.first_name} ${c.last_name ?? ""}`.trim();
}

function consentOk(status: string | null | undefined): boolean {
  return status === "Yes";
}

function consentBlocked(c: PulseContactInput): boolean {
  if (c.dnc) return true;
  const s = c.consent_status;
  return s === "No" || s === "Blocked";
}

function lastTouchMs(
  c: PulseContactInput,
  engagementByContact: Map<string, Date>,
): number {
  const fromEng = engagementByContact.get(c.id)?.getTime();
  const updated = c.updated_at ? new Date(c.updated_at).getTime() : NaN;
  const created = c.created_at ? new Date(c.created_at).getTime() : NaN;
  return Math.max(fromEng ?? 0, updated || 0, created || 0);
}

function parseBudget(raw: PulseContactInput["budget"]): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function pushLane(
  map: Map<PulseLaneId, PulseContactPreview[]>,
  lane: PulseLaneId,
  entry: PulseContactPreview,
) {
  const list = map.get(lane) ?? [];
  if (list.some((x) => x.contactId === entry.contactId)) return;
  list.push(entry);
  map.set(lane, list);
}

export function buildRelationshipPulse(input: {
  contacts: PulseContactInput[];
  tasks: PulseTaskInput[];
  engagement: PulseEngagementInput[];
  now?: Date;
}): RelationshipPulseResult {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();

  const engagementByContact = new Map<string, Date>();
  const recentHeating = new Set<string>();
  const highIntentRecent = new Set<string>();

  for (const e of input.engagement) {
    if (!e.contact_id) continue;
    const t = new Date(e.occurred_at).getTime();
    if (Number.isNaN(t)) continue;
    const prev = engagementByContact.get(e.contact_id);
    if (!prev || t > prev.getTime()) engagementByContact.set(e.contact_id, new Date(t));
    if (nowMs - t <= 7 * MS_DAY && HEATING_EVENTS.has(e.event_type)) {
      recentHeating.add(e.contact_id);
    }
    if (
      nowMs - t <= 14 * MS_DAY &&
      (HIGH_INTENT.has(e.event_type) || (e.score ?? 0) >= 50)
    ) {
      highIntentRecent.add(e.contact_id);
    }
  }

  const overdueByContact = new Map<string, number>();
  for (const task of input.tasks) {
    if (task.completed || !task.contact_id || !task.due_at) continue;
    const due = new Date(task.due_at).getTime();
    if (Number.isNaN(due) || due >= nowMs) continue;
    overdueByContact.set(task.contact_id, (overdueByContact.get(task.contact_id) ?? 0) + 1);
  }

  const laneMap = new Map<PulseLaneId, PulseContactPreview[]>();

  for (const c of input.contacts) {
    const seg = contactSegment(c.type);
    const name = displayName(c);
    const id = c.id;

    if (seg === "past-client") continue;

    const overdue = overdueByContact.get(id) ?? 0;
    if (overdue > 0) {
      pushLane(laneMap, "needs_attention", {
        contactId: id,
        name,
        reason: overdue === 1 ? "Overdue follow-up task" : `${overdue} overdue tasks`,
      });
    }

    if (!consentOk(c.consent_status) && !consentBlocked(c)) {
      pushLane(laneMap, "needs_attention", {
        contactId: id,
        name,
        reason: "Consent not validated — outreach may be blocked",
      });
    }

    if (consentBlocked(c) && seg !== "past-client") {
      pushLane(laneMap, "needs_attention", {
        contactId: id,
        name,
        reason: c.dnc ? "Do-not-contact flag" : "Compliance block on record",
      });
    }

    const touch = lastTouchMs(c, engagementByContact);
    if (seg === "cold-lead" && touch > 0 && nowMs - touch > 30 * MS_DAY) {
      pushLane(laneMap, "needs_attention", {
        contactId: id,
        name,
        reason: "No engagement in 30+ days",
      });
    }

    if (recentHeating.has(id)) {
      pushLane(laneMap, "heating_up", {
        contactId: id,
        name,
        reason: "Recent reply or engagement signal",
      });
    } else if (seg === "active-lead" && c.created_at) {
      const created = new Date(c.created_at).getTime();
      if (!Number.isNaN(created) && nowMs - created <= 7 * MS_DAY) {
        pushLane(laneMap, "heating_up", {
          contactId: id,
          name,
          reason: "New active lead this week",
        });
      }
    }

    if (seg === "active-lead" && parseBudget(c.budget) !== null && consentOk(c.consent_status)) {
      if (highIntentRecent.has(id) || recentHeating.has(id)) {
        pushLane(laneMap, "ready_for_business", {
          contactId: id,
          name,
          reason: "Active lead with budget and recent engagement",
        });
      }
    }
  }

  const lanes: PulseLane[] = [
    {
      id: "needs_attention",
      title: "Needs attention",
      subtitle: "Compliance gaps, overdue tasks, or going quiet",
      contacts: (laneMap.get("needs_attention") ?? []).slice(0, 50),
    },
    {
      id: "heating_up",
      title: "Heating up",
      subtitle: "Replies and fresh activity in the last 7 days",
      contacts: (laneMap.get("heating_up") ?? []).slice(0, 50),
    },
    {
      id: "ready_for_business",
      title: "Ready for business",
      subtitle: "Active leads with budget and engagement",
      contacts: (laneMap.get("ready_for_business") ?? []).slice(0, 50),
    },
  ];

  const need = lanes[0]!.contacts.length;
  const heat = lanes[1]!.contacts.length;
  let conciergeHint =
    "Review your lanes below — tap a contact to open their profile and next steps.";
  if (need > 0 && heat > 0) {
    conciergeHint = `${need} contact${need === 1 ? "" : "s"} need attention while ${heat} ${heat === 1 ? "is" : "are"} heating up. Prioritize overdue tasks and warm replies first.`;
  } else if (need > 0) {
    conciergeHint = `${need} contact${need === 1 ? "" : "s"} need attention — start with consent fixes and overdue follow-ups.`;
  } else if (heat > 0) {
    conciergeHint = `${heat} relationship${heat === 1 ? "" : "s"} showed recent engagement — good moment for personal outreach.`;
  }

  return {
    lanes,
    conciergeHint,
    generatedAt: now.toISOString(),
  };
}
