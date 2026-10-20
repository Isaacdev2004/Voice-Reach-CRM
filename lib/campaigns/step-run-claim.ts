import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Atomic scheduled → running claim so cron/test-run cannot double-execute the same step. */
export async function claimStepRunForExecution(
  runId: string,
  ownerId: string,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("campaign_step_runs")
    .update({
      status: "running",
      executed_at: new Date().toISOString(),
      result: { phase: "claimed", claimedAt: new Date().toISOString() },
    })
    .eq("id", runId)
    .eq("owner_id", ownerId)
    .eq("status", "scheduled")
    .select("id")
    .maybeSingle();

  return !error && Boolean(data?.id);
}

export async function releaseStepRunToScheduled(
  runId: string,
  ownerId: string,
  patch?: { scheduled_at?: string },
) {
  await supabaseAdmin
    .from("campaign_step_runs")
    .update({
      status: "scheduled",
      executed_at: null,
      result: { phase: "deferred", ...patch },
      ...(patch?.scheduled_at ? { scheduled_at: patch.scheduled_at } : {}),
    })
    .eq("id", runId)
    .eq("owner_id", ownerId);
}
