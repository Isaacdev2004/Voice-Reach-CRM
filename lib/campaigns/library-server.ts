import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  sequenceSummary,
  type LibraryCampaign,
  type LibraryStep,
  type LibraryRecipient,
  type LibraryRun,
  type LibraryEvent,
} from "./library-data";
/** Read every page in a deterministic order; never silently accept Supabase's default row cap. */
export async function ownedRows<T>(
  table: string,
  columns: string,
  ownerId: string,
  campaignId?: string,
  extra: Record<string, string> = {},
): Promise<T[]> {
  const all: T[] = [];
  const seen = new Set<string>();
  let expected: number | null = null;
  const size = 500;
  for (let offset = 0; ; ) {
    let q = supabaseAdmin
      .from(table)
      .select(columns, { count: "exact" })
      .eq("owner_id", ownerId)
      .order("id", { ascending: true })
      .range(offset, offset + size - 1);
    if (campaignId) q = q.eq("campaign_id", campaignId);
    for (const [key, value] of Object.entries(extra)) q = q.eq(key, value);
    const { data, error, count } = await q;
    if (
      error ||
      typeof count !== "number" ||
      count < 0 ||
      (expected !== null && count !== expected)
    )
      throw new Error(
        "Campaign information is temporarily unavailable. Please try again.",
      );
    expected = count;
    const rows = (data ?? []) as unknown as Array<Record<string,unknown>>;
    for (const row of rows) {
      if (typeof row.id !== "string" || seen.has(row.id))
        throw new Error(
          "Campaign information is temporarily unavailable. Please try again.",
        );
      seen.add(row.id);
    }
    all.push(...(rows as unknown as T[]));
    if (all.length > expected || (!rows.length && all.length < expected))
      throw new Error(
        "Campaign information is temporarily unavailable. Please try again.",
      );
    if (all.length === expected) return all;
    offset += rows.length;
  }
}
type SavedMetadata = {
  entity_id: string;
  created_at: string;
  metadata?: {
    blueprint?: { description?: string; audience?: string; goals?: string[] };
  };
};
async function savedMetadata(ownerId: string) {
  const rows = await ownedRows<SavedMetadata>(
    "audit_logs",
    "id, entity_id, created_at, metadata",
    ownerId,
    undefined,
    { entity_type: "campaign" },
  ).catch(() => []);
  const map = new Map<
    string,
    { description?: string; audience?: string; goals?: string[] }
  >();
  for (const row of rows.sort((a, b) =>
    (b.created_at ?? "").localeCompare(a.created_at ?? ""),
  )) {
    const bp = row.metadata?.blueprint;
    if (bp && !map.has(row.entity_id))
      map.set(row.entity_id, {
        description:
          typeof bp.description === "string" ? bp.description : undefined,
        audience: typeof bp.audience === "string" ? bp.audience : undefined,
        goals: Array.isArray(bp.goals)
          ? bp.goals.filter((g): g is string => typeof g === "string")
          : undefined,
      });
  }
  return map;
}
export async function readLibrary(ownerId: string) {
  const [campaigns, steps, recipients, metadata] = await Promise.all([
    ownedRows<
      Omit<
        LibraryCampaign,
        "enrollmentCount" | "stepCount" | "durationMinutes" | "channels"
      >
    >("campaigns", "*", ownerId),
    ownedRows<LibraryStep>(
      "campaign_steps",
      "id, campaign_id, step_order, type, delay_minutes",
      ownerId,
    ),
    ownedRows<LibraryRecipient>(
      "campaign_recipients",
      "id, campaign_id, contact_id",
      ownerId,
    ),
    savedMetadata(ownerId),
  ]);
  return campaigns.map((c) => ({
    ...c,
    ...metadata.get(c.id),
    ...sequenceSummary(steps.filter((s) => s.campaign_id === c.id)),
    enrollmentCount: new Set(
      recipients.filter((r) => r.campaign_id === c.id).map((r) => r.contact_id),
    ).size,
  }));
}
export async function readPreview(ownerId: string, campaignId: string) {
  const { data: campaign, error } = await supabaseAdmin
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error)
    throw new Error(
      "Campaign information is temporarily unavailable. Please try again.",
    );
  if (!campaign) return null;
  const [steps, recipients, runs, events, contacts, metadata] =
    await Promise.all([
      ownedRows<LibraryStep>("campaign_steps", "*", ownerId, campaignId),
      ownedRows<LibraryRecipient>(
        "campaign_recipients",
        "id, campaign_id, contact_id, eligibility_status, delivery_status, updated_at",
        ownerId,
        campaignId,
      ),
      ownedRows<LibraryRun>(
        "campaign_step_runs",
        "id, step_id, recipient_id, status, scheduled_at, executed_at",
        ownerId,
        campaignId,
      ),
      ownedRows<LibraryEvent>(
        "engagement_events",
        "id, event_type, contact_id, occurred_at",
        ownerId,
        campaignId,
      )
        .then((data) => ({ data, available: true }))
        .catch(() => ({ data: [] as LibraryEvent[], available: false })),
      ownedRows<NonNullable<LibraryRecipient["contact"]>>(
        "contacts",
        "id, first_name, last_name, email, phone",
        ownerId,
      ),
      savedMetadata(ownerId),
    ]);
  const byId = new Map(contacts.map((c) => [c.id, c]));
  return {
    campaign: {
      ...campaign,
      ...metadata.get(campaign.id),
      ...sequenceSummary(steps),
      enrollmentCount: new Set(recipients.map((r) => r.contact_id)).size,
    },
    steps: steps.sort((a, b) => a.step_order - b.step_order),
    recipients: recipients.map((r) => ({
      ...r,
      contact: byId.get(r.contact_id) ?? null,
    })),
    runs,
    engagement: events.data,
    performanceAvailable: events.available,
  };
}
