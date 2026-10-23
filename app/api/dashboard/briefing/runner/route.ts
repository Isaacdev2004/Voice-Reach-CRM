import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { briefingDue, Preferences } from "@/lib/dashboard/briefing/model";
import { generateBriefing } from "@/lib/dashboard/briefing/service";
import { insertDocument } from "@/lib/dashboard/briefing/store";
import { zonedParts } from "@/lib/calendar/time";
export const maxDuration = 60;
export const GET = withApiHandler(async (request) => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return apiError("Unauthorized", { status: 401 });
  let processed = 0,
    failed = 0,
    checked = 0;
  const now = new Date(),
    started = Date.now();
  // Separate opt-in worker: never runs the campaign execution engine or sends communications.
  for (let offset = 0; ; offset += 100) {
    const r = await supabaseAdmin
      .from("audit_logs")
      .select("owner_id, metadata")
      .eq("entity_type", "dashboard_private")
      .eq("action", "DASHBOARD_PRIVATE")
      .eq("metadata->preferences->>enabled", "true")
      .order("id", { ascending: true })
      .range(offset, offset + 99);
    if (r.error)
      return apiError("Briefing scheduler storage unavailable.", {
        status: 503,
      });
    for (const row of r.data ?? []) {
      if (!row.metadata?.preferences) continue;
      checked++;
      const p = Preferences.safeParse(row.metadata.preferences);
      if (!p.success || !p.data.enabled) continue;
      try {
        const settings = await supabaseAdmin
          .from("audit_logs")
          .select("metadata")
          .eq("owner_id", row.owner_id)
          .eq("entity_type", "user_settings")
          .eq("action", "SETTINGS_SAVED")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (settings.error) throw Error();
        const workspace = settings.data?.metadata?.settings?.workspace;
        if (
          !briefingDue(
            p.data,
            now,
            workspace?.quietHoursStart,
            workspace?.quietHoursEnd,
          )
        )
          continue;
        await generateBriefing(row.owner_id, p.data, now);
        if (p.data.delivery === "in_app")
          await insertDocument(
            row.owner_id,
            `notification:${zonedParts(now, p.data.timezone).date}`,
            { title: "Your daily business briefing is ready." },
            "DASHBOARD_BRIEFING_READY",
          );
        processed++;
      } catch {
        failed++;
      }
      if (Date.now() - started > 40000)
        return apiOk({ processed, failed, checked, partial: true });
    }
    if ((r.data?.length ?? 0) < 100) break;
  }
  return apiOk({ processed, failed, checked, partial: false });
});
