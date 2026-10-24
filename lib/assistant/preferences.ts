import { z } from "zod";
export const AssistantPreferencesSchema = z
  .object({
    tone: z
      .enum(["warm", "professional", "concise", "luxury"])
      .default("luxury"),
    style: z.enum(["concise", "detailed"]).default("concise"),
    notifications: z.boolean().default(false),
    retainDays: z
      .union([z.literal(7), z.literal(30), z.literal(90)])
      .default(30),
    defaultLenderId: z.string().uuid().nullable().default(null),
    defaultTitleId: z.string().uuid().nullable().default(null),
    confirmLowRisk: z.boolean().default(true),
  })
  .strict();
export type AssistantPreferences = z.infer<typeof AssistantPreferencesSchema>;
