import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  CalendarPreferencesSchema,
  DEFAULT_CALENDAR_PREFERENCES,
} from "@/lib/calendar/preferences";
import { z } from "zod";
export const GET = withApiHandler(async () => {
  const owner = await requireUserId();
  const result = await supabaseAdmin
    .from("audit_logs")
    .select("id, metadata")
    .eq("owner_id", owner)
    .eq("entity_type", "calendar_preferences")
    .eq("action", "CALENDAR_PREFERENCES_SAVED")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error)
    return apiError("Calendar preferences could not be loaded.", {
      status: 503,
    });
  const parsed = CalendarPreferencesSchema.safeParse(
    result.data?.metadata?.preferences ?? {},
  );
  if (!parsed.success)
    return apiError("Saved calendar preferences need review.", { status: 503 });
  return apiOk({
    preferences: parsed.data,
    version: result.data?.id ?? null,
    defaults: DEFAULT_CALENDAR_PREFERENCES,
  });
});
export const PUT = withApiHandler(async (request) => {
  const owner = await requireUserId();
  const body = z
    .object({
      preferences: CalendarPreferencesSchema,
      version: z.string().uuid().nullable(),
    })
    .parse(await request.json());
  const saved = await supabaseAdmin.rpc("save_calendar_preferences", {
    p_owner: owner,
    p_preferences: body.preferences,
    p_expected: body.version,
  });
  if (saved.error)
    return apiError(
      saved.error.message.includes("stale")
        ? "Preferences changed on another device. Reload before saving."
        : "Preferences could not be saved. Calendar setup may be required.",
      { status: saved.error.message.includes("stale") ? 409 : 503 },
    );
  return apiOk({ preferences: body.preferences, version: saved.data });
});
