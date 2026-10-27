import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ConciergeError } from "./access";
import type { CaseRecord } from "./schema";
export async function loadCase(owner: string) {
  const r = await supabaseAdmin
    .from("concierge_cases")
    .select("*")
    .eq("owner_id", owner)
    .maybeSingle();
  if (r.error)
    throw new ConciergeError(
      "Concierge storage is not ready. Your existing CRM remains available.",
      503,
    );
  return r.data as CaseRecord | null;
}
export async function mutate(
  owner: string,
  actor: string,
  requestId: string,
  version: number,
  patch: Record<string, unknown>,
  action: string,
) {
  const r = await supabaseAdmin.rpc("mutate_concierge_case", {
    p_owner: owner,
    p_actor: actor,
    p_request: requestId,
    p_version: version,
    p_patch: patch,
    p_action: action,
  });
  if (r.error) {
    if (r.error.message.includes("STALE"))
      throw new ConciergeError(
        "This workspace changed. Reload before saving your changes.",
        409,
      );
    if (r.error.message.includes("REPLAY"))
      throw new ConciergeError(
        "This request identifier was already used for different changes.",
        409,
      );
    throw r.error;
  }
  return r.data as CaseRecord;
}
export async function events(owner: string) {
  const r = await supabaseAdmin
    .from("concierge_events")
    .select("id,action,created_at")
    .eq("owner_id", owner)
    .order("created_at", { ascending: false })
    .limit(50);
  if (r.error) throw r.error;
  return r.data;
}
