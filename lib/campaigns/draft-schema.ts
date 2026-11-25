import { z } from "zod";
// Incomplete copy and zero steps are valid drafts. Activation has stricter validation.
export const DraftSnapshot = z
  .object({
    id: z.string().max(200),
    name: z.string().max(500),
    description: z.string().max(20000),
    audience: z.string().max(2000),
    durationDays: z.number().nonnegative(),
    goals: z.array(z.string().max(2000)).max(100),
    stats: z.object({
      reach: z.number(),
      replies: z.number(),
      responseRate: z.number(),
    }),
    steps: z
      .array(
        z.object({
          id: z.string().max(200),
          order: z.number().int().positive(),
          type: z.enum([
            "sms",
            "email",
            "voicemail",
            "avatar_video",
            "task",
            "callback",
            "wait",
            "retargeting",
          ]),
          title: z.string().max(500),
          description: z.string().max(50000),
          dayLabel: z.string().max(100),
          timeLabel: z.string().max(100),
          delayMinutes: z.number().int().nonnegative().optional(),
          status: z.enum(["sent", "active", "pending", "draft"]),
          voiceAssetId: z.string().uuid().nullable().optional(),
          voiceAssetTitle: z.string().nullable().optional(),
          reviewRequest: z.enum(["request", "reminder"]).optional(),
          resourceKey: z.string().max(80).optional(),
          attachments: z
            .array(
              z.object({
                id: z.string(),
                storagePath: z.string().max(1000),
                fileName: z.string().max(500),
                mimeType: z.string().max(100),
                sizeBytes: z.number().nonnegative().optional(),
              }),
            )
            .max(10)
            .optional(),
        }),
      )
      .max(200),
  })
  .superRefine((draft, ctx) => {
    if (
      new Set(draft.steps.map((s) => s.id)).size !== draft.steps.length ||
      draft.steps.some((s, i) => s.order !== i + 1)
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Steps must have unique IDs and consecutive order.",
      });
  });
