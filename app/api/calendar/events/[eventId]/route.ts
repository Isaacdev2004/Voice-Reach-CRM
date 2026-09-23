import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { deleteOwnerCalendarEvent, updateOwnerCalendarEvent } from "@/lib/calendar/manage-event";
import { z } from "zod";

type RouteContext = { params: Promise<{ eventId: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PatchEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  description: z.string().max(2000).optional(),
  meetingLink: z
    .union([z.string().url().max(500), z.literal("")])
    .nullable()
    .optional(),
});

export const PATCH = withApiHandler<RouteContext>(async (request, context) => {
  const ownerId = await requireUserId();
  const { eventId } = await context.params;
  if (!UUID_RE.test(eventId)) {
    return apiError("Event not found", { status: 404, code: "not_found" });
  }

  const body = PatchEventSchema.parse(await request.json());
  const meetingLink =
    body.meetingLink === undefined ? undefined : body.meetingLink?.trim() || null;
  const result = await updateOwnerCalendarEvent({
    ownerId,
    eventId,
    title: body.title,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    description: body.description,
    meetingLink,
  });

  return apiOk(result);
});

export const DELETE = withApiHandler<RouteContext>(async (_request, context) => {
  const ownerId = await requireUserId();
  const { eventId } = await context.params;
  if (!UUID_RE.test(eventId)) {
    return apiError("Event not found", { status: 404, code: "not_found" });
  }

  await deleteOwnerCalendarEvent({ ownerId, eventId });
  return apiOk({ deleted: true });
});
