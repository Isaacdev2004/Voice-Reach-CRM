import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { CalendarPreferencesSchema } from "./preferences";
export async function loadCalendarPreferences(owner: string) {
  const r = await supabaseAdmin
    .from("audit_logs")
    .select("metadata")
    .eq("owner_id", owner)
    .eq("entity_type", "calendar_preferences")
    .eq("action", "CALENDAR_PREFERENCES_SAVED")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (r.error) throw Error("Calendar preferences could not be verified.");
  return CalendarPreferencesSchema.parse(r.data?.metadata?.preferences ?? {});
}
