import { createHash, randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  CalendarPreferencesSchema,
  type CalendarPreferences,
} from "./preferences";
export const preferenceDocumentId = (owner: string) => {
  const h = createHash("md5")
    .update(`myari-calendar-preferences:${owner}`)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
export class CalendarPreferenceConflict extends Error {}
export async function readCalendarPreferences(owner: string) {
  const doc = await supabaseAdmin
    .from("audit_logs")
    .select("id, metadata")
    .eq("owner_id", owner)
    .eq("id", preferenceDocumentId(owner))
    .eq("entity_type", "calendar_preferences_private")
    .maybeSingle();
  if (doc.error) throw Error("Preferences unavailable");
  if (doc.data) {
    const revision = doc.data.metadata?.revision;
    if (typeof revision !== "string") throw Error("Preferences unavailable");
    return {
      preferences: CalendarPreferencesSchema.parse(
        doc.data.metadata?.preferences,
      ),
      version: revision,
    };
  }
  const legacy = await supabaseAdmin
    .from("audit_logs")
    .select("id, metadata")
    .eq("owner_id", owner)
    .eq("entity_type", "calendar_preferences")
    .eq("action", "CALENDAR_PREFERENCES_SAVED")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (legacy.error) throw Error("Preferences unavailable");
  return {
    preferences: CalendarPreferencesSchema.parse(
      legacy.data?.metadata?.preferences ?? {},
    ),
    version: legacy.data?.id ?? null,
  };
}
export async function saveCalendarPreferences(
  owner: string,
  preferences: CalendarPreferences,
  expected: string | null,
) {
  const current = await readCalendarPreferences(owner);
  if (current.version !== expected) throw new CalendarPreferenceConflict();
  const version = randomUUID(),
    id = preferenceDocumentId(owner),
    metadata = { preferences, revision: version };
  const existing = await supabaseAdmin
    .from("audit_logs")
    .select("id")
    .eq("owner_id", owner)
    .eq("id", id)
    .eq("entity_type", "calendar_preferences_private")
    .maybeSingle();
  if (existing.error) throw Error("Preferences unavailable");
  const result = existing.data
    ? await supabaseAdmin
        .from("audit_logs")
        .update({ metadata })
        .eq("owner_id", owner)
        .eq("id", id)
        .eq("metadata->>revision", expected!)
        .select("id")
        .maybeSingle()
    : await supabaseAdmin
        .from("audit_logs")
        .insert({
          id,
          owner_id: owner,
          entity_type: "calendar_preferences_private",
          action: "CALENDAR_PREFERENCES_DOCUMENT",
          metadata,
        })
        .select("id")
        .maybeSingle();
  if (result.error?.code === "23505" || (!result.error && !result.data))
    throw new CalendarPreferenceConflict();
  if (result.error) throw Error("Preferences unavailable");
  return { preferences, version };
}
