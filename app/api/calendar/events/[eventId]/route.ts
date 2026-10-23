import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import {
  deleteOwnerCalendarEvent,
  updateOwnerCalendarEvent,
} from "@/lib/calendar/manage-event";
import { z } from "zod";
import { validTimeZone } from "@/lib/calendar/time";
type Context = {
  params: Promise<{
    eventId: string;
  }>;
};
const patch = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  startsAt: z.string().datetime({ offset: true }).optional(),
  endsAt: z.string().datetime({ offset: true }).optional(),
  description: z.string().max(2000).optional(),
  meetingLink: z
    .string()
    .url()
    .refine((v) => /^https?:\/\//.test(v))
    .nullable()
    .optional(),
  allDay: z.boolean().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  contactId: z.string().uuid().nullable().optional(),
  version: z.string().max(100),
  etag: z.string().max(500).optional(),
  timeZone: z.string().refine(validTimeZone).optional(),
  appointmentType: z
    .enum(["meeting", "showing", "buyer_consultation", "listing_appointment"])
    .optional(),
  appointmentStatus: z.enum(["scheduled", "completed", "missed"]).optional(),
  allowConflict: z.boolean().optional(),
});
function failure(e: unknown) {
  const stale =
    e instanceof Error &&
    ["CALENDAR_CONFLICT", "CALENDAR_OVERLAP"].includes(e.message);
  return apiError(
    stale
      ? "This appointment changed or overlaps another event. Refresh before saving."
      : "Appointment could not be changed. Refresh and try again.",
    { status: stale ? 409 : 503 },
  );
}
export const PATCH = withApiHandler<Context>(async (req, ctx) => {
  const ownerId = await requireUserId();
  const { eventId } = await ctx.params;
  if (!z.string().uuid().safeParse(eventId).success)
    return apiError("Appointment not found.", { status: 404 });
  const body = patch.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return apiError("Check the appointment details and refresh its version.", {
      status: 400,
    });
  try {
    return apiOk(
      await updateOwnerCalendarEvent({ ownerId, eventId, ...body.data }),
    );
  } catch (e) {
    return failure(e);
  }
});
export const DELETE = withApiHandler<Context>(async (req, ctx) => {
  const ownerId = await requireUserId();
  const { eventId } = await ctx.params;
  if (!z.string().uuid().safeParse(eventId).success)
    return apiError("Appointment not found.", { status: 404 });
  const q = new URL(req.url).searchParams;
  try {
    await deleteOwnerCalendarEvent({
      ownerId,
      eventId,
      version: q.get("version") ?? undefined,
      etag: q.get("etag") ?? undefined,
    });
    return apiOk({ deleted: true });
  } catch (e) {
    return failure(e);
  }
});
