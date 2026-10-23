import { z } from "zod";
import { validTimeZone, wallTimeToInstant } from "./time";
export const CalendarEventSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    description: z.string().max(2000).optional(),
    contactId: z.string().uuid().nullable().optional(),
    recurrence: z.enum(["none", "daily", "weekly", "monthly"]).default("none"),
    meetingLink: z
      .union([
        z
          .string()
          .url()
          .refine((v) => /^https?:\/\//.test(v)),
        z.literal(""),
      ])
      .nullable()
      .optional(),
    timeZone: z.string().refine(validTimeZone).default("America/New_York"),
    kind: z.enum(["crm", "callback", "reminder"]).default("crm"),
    appointmentType: z
      .enum(["meeting", "showing", "buyer_consultation", "listing_appointment"])
      .default("meeting"),
    appointmentStatus: z
      .enum(["scheduled", "completed", "missed"])
      .default("scheduled"),
    allDay: z.boolean().default(false),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    syncToGoogle: z.boolean().default(false),
    clientRequestId: z.string().uuid().optional(),
    allowConflict: z.boolean().default(false),
    version: z.string().max(100).optional(),
    etag: z.string().max(500).optional(),
  })
  .refine(
    (v) => v.recurrence === "none" || v.appointmentStatus === "scheduled",
    {
      message:
        "Record completed or missed outcomes on individual appointments after creating a recurring series.",
    },
  )
  .refine((v) => Date.parse(v.endsAt) > Date.parse(v.startsAt), {
    message: "End time must be after start time.",
  })
  .refine(
    (v) => {
      if (!v.allDay) return true;
      try {
        return (
          !!v.startDate &&
          !!v.endDate &&
          wallTimeToInstant(v.startDate, "00:00", v.timeZone, "earlier") ===
            new Date(v.startsAt).toISOString() &&
          wallTimeToInstant(v.endDate, "00:00", v.timeZone, "earlier") ===
            new Date(v.endsAt).toISOString()
        );
      } catch {
        return false;
      }
    },
    {
      message:
        "All-day events must use valid exclusive dates in the selected timezone.",
    },
  );
