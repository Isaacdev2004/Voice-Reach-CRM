import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { taskBriefing, type BriefingRow } from "./briefing";
const SOURCES = [
  {
    title: "Tasks due or overdue",
    table: "contact_tasks",
    columns: "id,title,due_at,completed",
    path: "/dashboard/tasks",
  },
  {
    title: "Appointments in the next 24 hours",
    table: "calendar_events",
    columns: "id,title,starts_at,ends_at",
    path: "/dashboard/calendar",
  },
  {
    title: "Recent delivery failure events",
    table: "outbound_delivery_events",
    columns: "id,event_type,occurred_at",
    path: "/dashboard/activity",
  },
  {
    title: "Recent campaign activity",
    table: "engagement_events",
    columns: "id,event_type,occurred_at,campaign_id",
    path: "/dashboard/campaigns",
  },
  {
    title: "Transaction checklists",
    table: "task_transactions",
    columns: "id,payload,updated_at",
    path: "/dashboard/tasks",
  },
];
export async function readBusinessBriefing(owner: string) {
  if (!owner) throw Error("Unauthorized");
  const now = new Date(),
    end = new Date(now.getTime() + 86400000).toISOString();
  async function readSource(index: number) {
    const s = SOURCES[index];
    let q = supabaseAdmin
      .from(s.table)
      .select(s.columns, { count: "exact" })
      .eq("owner_id", owner)
      .limit(25);
    if (index === 0)
      q = q.eq("completed", false).lte("due_at", end).order("due_at");
    if (index === 1)
      q = q
        .gte("starts_at", now.toISOString())
        .lte("starts_at", end)
        .order("starts_at");
    if (index === 2)
      q = q
        .in("event_type", ["failed", "undelivered", "bounced", "rejected"])
        .gte("received_at", new Date(now.getTime() - 86400000).toISOString())
        .order("received_at", { ascending: false });
    if (index === 3)
      q = q
        .not("campaign_id", "is", null)
        .gte("occurred_at", new Date(now.getTime() - 86400000).toISOString())
        .order("occurred_at", { ascending: false });
    if (index === 4) q = q.order("updated_at", { ascending: false }).limit(10);
    const r = await q;
    if (r.error) throw Error("SOURCE_UNAVAILABLE");
    return { rows: (r.data ?? []) as unknown as BriefingRow[], count: r.count };
  }
  const results = await Promise.allSettled(
    SOURCES.map((_, i) => readSource(i)),
  );
  const sections = results.map((r, i) => {
    const s = SOURCES[i];
    if (r.status !== "fulfilled")
      return {
        title: s.title,
        available: false,
        items: [],
        note: "This source is unavailable. Refresh in its workspace.",
      };
    const { rows, count } = r.value;
    return {
      title: s.title,
      available: true,
      matchingCount: count,
      limited: (count ?? 0) > rows.length,
      items:
        i === 0
          ? taskBriefing(rows, now)
          : rows.map((v) => {
              const payload = (v.payload ?? {}) as Record<string, unknown>;
              const closing =
                typeof payload.closingDate === "string"
                  ? payload.closingDate
                  : null;
              return {
                id: v.id,
                title: String(
                  v.title ??
                    v.event_type ??
                    payload.name ??
                    "Transaction checklist",
                ),
                date: v.starts_at ?? v.occurred_at ?? closing ?? v.updated_at,
                href: v.campaign_id
                  ? `/dashboard/campaigns/${v.campaign_id}`
                  : s.path,
                ...(i === 4
                  ? {
                      recordedClosingDate: closing,
                      cancelled: payload.cancelled === true,
                    }
                  : {}),
              };
            }),
      note:
        i === 2
          ? "Recorded failure events, not unique failed messages; review Delivery Audit before retrying."
          : i === 4
            ? "Recorded expected closing dates are not legal deadlines. Open each checklist for full progress and milestone details."
            : "Recorded MyARI data; no live external calendar sync performed.",
    };
  });
  return {
    generatedAt: now.toISOString(),
    sections,
    limitations: [
      "Unanswered-message status is not reliably tracked; review the actual conversation inbox.",
      "No missing activity or transaction deadline is inferred.",
    ],
  };
}
