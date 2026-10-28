import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ConciergeError } from "./access";
import type { PremiumDraft } from "@/lib/campaigns/premium-drafts";
/** Read-only inspection. Never repairs, deletes or overwrites a partially saved campaign. */
export async function verifyPreparedDraft(owner: string, campaignId: string, expected: PremiumDraft) {
  const [campaign, steps] = await Promise.all([
    supabaseAdmin.from("campaigns").select("id,status,provider,script_id").eq("owner_id", owner).eq("id", campaignId).maybeSingle(),
    supabaseAdmin.from("campaign_steps").select("step_order,type,title,description,delay_minutes,time_label").eq("owner_id", owner).eq("campaign_id", campaignId).order("step_order"),
  ]);
  const row = campaign.data;
  if (campaign.error || steps.error || !row || row.status !== "draft" || row.provider !== "mock" || row.script_id !== `builder-${expected.id}` || steps.data.length !== expected.steps.length || expected.steps.some((s, i) => {
    const r = steps.data[i];
    return !r || r.step_order !== s.order || r.type !== s.type || r.title !== s.title || r.description !== (s.description ?? "") || r.delay_minutes !== (s.delayMinutes ?? 0) || r.time_label !== (s.timeLabel ?? null);
  })) throw new ConciergeError("Draft save is incomplete, changed, or unverified. Inspect the existing campaign in the editor; Concierge will not overwrite or retry it automatically.", 409);
}
