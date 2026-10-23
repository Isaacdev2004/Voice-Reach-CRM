import { z } from "zod";
import { validTimeZone } from "./time";
export const CalendarPreferencesSchema = z
  .object({
    view: z.enum(["month", "week", "day", "agenda"]).default("week"),
    visibility: z.record(z.string().max(200), z.boolean()).default({}),
    colors: z
      .record(z.string().max(200), z.string().regex(/^#[a-f\d]{6}$/i))
      .default({}),
    hour24: z.boolean().default(false),
    mondayStart: z.boolean().default(false),
    duration: z.number().int().min(15).max(480).default(60),
    workStart: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .default("09:00"),
    workEnd: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .default("17:00"),
    workDays: z
      .array(z.number().int().min(0).max(6))
      .max(7)
      .default([1, 2, 3, 4, 5]),
    timezone: z.string().refine(validTimeZone).default("America/New_York"),
    leftOpen: z.boolean().default(true),
    rightOpen: z.boolean().default(true),
    mobileLeftOpen: z.boolean().default(false),
    mobileRightOpen: z.boolean().default(false),
    bufferBefore: z.number().int().min(0).max(240).default(0),
    bufferAfter: z.number().int().min(0).max(240).default(0),
    travelMinutes: z.number().int().min(0).max(240).default(0),
    noticeMinutes: z.number().int().min(0).max(43200).default(60),
    inAppReminders: z.boolean().default(false),
  })
  .strict()
  .refine((p) => p.workEnd > p.workStart, {
    message: "Working hours must end after they start.",
  });
export type CalendarPreferences = z.infer<typeof CalendarPreferencesSchema>;
export const DEFAULT_CALENDAR_PREFERENCES = CalendarPreferencesSchema.parse({});
