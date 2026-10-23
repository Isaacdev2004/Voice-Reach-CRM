import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";
import { apiOk, apiError, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { Preferences } from "@/lib/dashboard/briefing/model";
import { savePreferences } from "@/lib/dashboard/briefing/store";
export const PUT = withApiHandler(async (request) => {
  const owner = await requireUserId();
  if (
    request.headers.get("X-MyARI-Owner") &&
    request.headers.get("X-MyARI-Owner") !== owner
  )
    return apiError("Account changed. Reload before saving.", { status: 409 });
  try {
    const b = z
      .object({
        preferences: Preferences,
        version: z.string().uuid().nullable(),
      })
      .strict()
      .parse(await request.json());
    if (b.preferences.enabled) {
      const saved = await supabaseAdmin
        .from("audit_logs")
        .select("metadata")
        .eq("owner_id", owner)
        .eq("entity_type", "user_settings")
        .eq("action", "SETTINGS_SAVED")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (saved.error) throw Error("Settings unavailable");
      const workspace = saved.data?.metadata?.settings?.workspace;
      const start = workspace?.quietHoursStart ?? "20:00",
        end = workspace?.quietHoursEnd ?? "08:00",
        time = b.preferences.time;
      if (
        start !== end &&
        (start < end
          ? time >= start && time < end
          : time >= start || time < end)
      )
        return apiError(
          "Choose a briefing time outside workspace quiet hours.",
          { status: 400, code: "quiet_hours" },
        );
    }
    return apiOk(await savePreferences(owner, b.preferences, b.version));
  } catch (e) {
    if (e instanceof z.ZodError)
      return apiError("Review your briefing preferences.", { status: 400 });
    const conflict = e instanceof Error && e.message === "Dashboard conflict";
    return apiError(
      conflict
        ? "Preferences changed in another session. Refresh before saving."
        : "Preferences could not be saved. Please retry.",
      { status: conflict ? 409 : 503 },
    );
  }
});
