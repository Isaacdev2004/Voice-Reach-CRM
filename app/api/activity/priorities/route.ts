import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { validTimeZone } from "@/lib/calendar/time";
import { loadCalendarPreferences } from "@/lib/calendar/load-preferences";
import { readPriorities } from "@/lib/activity/priorities";
export const GET = withApiHandler(async (req: Request) => {
  const owner = await requireUserId();
  const supplied = new URL(req.url).searchParams.get("timezone");
  let zone = supplied;
  try {
    zone ??= (await loadCalendarPreferences(owner)).timezone;
  } catch {
    return apiError("Calendar timezone preferences could not be loaded.", {
      status: 503,
    });
  }
  if (!validTimeZone(zone))
    return apiError("Choose a valid timezone.", { status: 400 });
  try {
    return apiOk({ ...(await readPriorities(owner, zone)), timezone: zone });
  } catch {
    return apiError("Daily priorities are temporarily unavailable.", {
      status: 503,
    });
  }
});
