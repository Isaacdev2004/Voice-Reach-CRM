import { createHash, randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Preferences, type BriefingPreferences } from "./model";
export const documentId = (owner: string, key: string) => {
  const h = createHash("sha256")
    .update(`myari-dashboard:${owner}:${key}`)
    .digest("hex")
    .slice(0, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20)}`;
};
export async function readDocument(owner: string, key: string) {
  const r = await supabaseAdmin
    .from("audit_logs")
    .select("id, metadata, created_at")
    .eq("owner_id", owner)
    .eq("id", documentId(owner, key))
    .eq("entity_type", "dashboard_private")
    .maybeSingle();
  if (r.error) throw Error("Dashboard storage unavailable");
  return r.data;
}
export async function insertDocument(
  owner: string,
  key: string,
  metadata: Record<string, unknown>,
  action = "DASHBOARD_PRIVATE",
) {
  const r = await supabaseAdmin
    .from("audit_logs")
    .insert({
      id: documentId(owner, key),
      owner_id: owner,
      entity_type: "dashboard_private",
      action,
      metadata,
    })
    .select("id")
    .maybeSingle();
  if (r.error?.code === "23505") return false;
  if (r.error || !r.data) throw Error("Dashboard storage unavailable");
  return true;
}
export async function loadPreferences(owner: string) {
  const row = await readDocument(owner, "preferences");
  return {
    preferences: Preferences.parse(row?.metadata?.preferences ?? {}),
    version: row?.metadata?.revision ?? null,
  };
}
export async function savePreferences(
  owner: string,
  preferences: BriefingPreferences,
  expected: string | null,
) {
  const revision = randomUUID();
  const metadata = { preferences, revision };
  if (expected === null) {
    if (!(await insertDocument(owner, "preferences", metadata)))
      throw Error("Dashboard conflict");
  } else {
    const r = await supabaseAdmin
      .from("audit_logs")
      .update({ metadata })
      .eq("owner_id", owner)
      .eq("id", documentId(owner, "preferences"))
      .eq("entity_type", "dashboard_private")
      .eq("metadata->>revision", expected)
      .select("id")
      .maybeSingle();
    if (r.error) throw Error("Dashboard storage unavailable");
    if (!r.data) throw Error("Dashboard conflict");
  }
  return { preferences, version: revision };
}
export async function recordVisit(owner: string, at: string) {
  const previous = await readDocument(owner, "visit");
  if (!previous) {
    await insertDocument(owner, "visit", { at, previousAt: null });
    return;
  }
  if (previous.metadata?.at >= at) return;
  const r = await supabaseAdmin
    .from("audit_logs")
    .update({ metadata: { at, previousAt: previous.metadata.at } })
    .eq("owner_id", owner)
    .eq("id", previous.id)
    .eq("metadata->>at", previous.metadata.at);
  if (r.error) throw Error("Dashboard storage unavailable");
}
