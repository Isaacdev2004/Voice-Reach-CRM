import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { evaluateTriggers } from "@/lib/automations/engine";

type EngagementEventType =
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

type EngagementChannel = "voicemail" | "sms" | "email" | "video" | "task" | "callback" | "system";

export const ENGAGEMENT_SCORE_MAP: Record<EngagementEventType, number> = {
  delivered: 1,
  opened: 2,
  listened: 4,
  clicked: 5,
  replied: 8,
  callback: 12,
  task_completed: 3,
  opt_out: -10,
  blocked: -5,
  failed: 0,
};

export async function recordEngagementEvent(params: {
  ownerId: string;
  contactId: string | null;
  campaignId?: string | null;
  stepId?: string | null;
  eventType: EngagementEventType;
  channel?: EngagementChannel;
  metadata?: Record<string, unknown>;
}) {
  const score = ENGAGEMENT_SCORE_MAP[params.eventType] ?? 0;

  const { data, error } = await supabaseAdmin
    .from("engagement_events")
    .insert({
      owner_id: params.ownerId,
      contact_id: params.contactId,
      campaign_id: params.campaignId ?? null,
      step_id: params.stepId ?? null,
      event_type: params.eventType,
      channel: params.channel ?? "system",
      score,
      metadata: params.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await evaluateTriggers({
    ownerId: params.ownerId,
    contactId: params.contactId ?? undefined,
    event: params.eventType,
    metadata: params.metadata,
  }).catch((e) => console.warn("[engagement] trigger eval failed:", e));

  return data;
}

export async function computeEngagementScore(ownerId: string, contactId: string) {
  const { data, error } = await supabaseAdmin
    .from("engagement_events")
    .select("score")
    .eq("owner_id", ownerId)
    .eq("contact_id", contactId);

  if (error) return 0;
  const total = (data ?? []).reduce((sum, row) => sum + (row.score ?? 0), 0);
  return Math.max(0, Math.min(100, total));
}
