import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import {
  CalendarPreferencesSchema,
  DEFAULT_CALENDAR_PREFERENCES,
} from "@/lib/calendar/preferences";
import {
  CalendarPreferenceConflict,
  readCalendarPreferences,
  saveCalendarPreferences,
} from "@/lib/calendar/preferences-store";
import { z } from "zod";
export const GET = withApiHandler(async () => {
  const owner = await requireUserId();
  try {
    return apiOk({
      ...(await readCalendarPreferences(owner)),
      defaults: DEFAULT_CALENDAR_PREFERENCES,
    });
  } catch {
    return apiError(
      "Calendar preferences could not be loaded. Local calendar controls remain available.",
      { status: 503, code: "preferences_unavailable" },
    );
  }
});
export const PUT = withApiHandler(async (request) => {
  const owner = await requireUserId();
  const body = z
    .object({
      preferences: CalendarPreferencesSchema,
      version: z.string().uuid().nullable(),
    })
    .parse(await request.json());
  try {
    return apiOk(
      await saveCalendarPreferences(owner, body.preferences, body.version),
    );
  } catch (error) {
    return error instanceof CalendarPreferenceConflict
      ? apiError(
          "Preferences changed on another device. Reload before saving.",
          { status: 409, code: "preferences_conflict" },
        )
      : apiError(
          "Calendar preferences could not be saved. Your current view remains available.",
          { status: 503, code: "preferences_unavailable" },
        );
  }
});
