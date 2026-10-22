import { z } from "zod";
import type { LibraryPreview } from "./library-data";
const Step = z
  .object({
    id: z.string().max(200),
    order: z.number().int().min(1),
    type: z.enum([
      "email",
      "sms",
      "voicemail",
      "avatar_video",
      "task",
      "callback",
      "wait",
      "retargeting",
    ]),
    title: z.string().min(1).max(300),
    description: z.string().max(50000).default(""),
    delayMinutes: z.number().int().nonnegative().max(5256000).optional(),
    dayLabel: z.string().max(100).optional(),
    timeLabel: z.string().max(100).optional(),
    voiceAssetId: z.string().uuid().nullable().optional(),
    attachments: z
      .array(
        z.object({
          id: z.string(),
          storagePath: z.string(),
          fileName: z.string(),
          mimeType: z.string(),
          sizeBytes: z.number().optional(),
        }),
      )
      .max(20)
      .optional(),
  })
  .strict();
/** Import content only. Execution status, recipient IDs and live providers are deliberately not accepted. */
export const CampaignImportSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().max(10000).default(""),
    audience: z.string().max(1000).default("Selected contacts"),
    durationDays: z.number().nonnegative().max(3650).default(1),
    goals: z.array(z.string().max(1000)).max(20).default([]),
    steps: z.array(Step).min(1).max(100),
  })
  .strict();
export function duplicateBlueprint(data: LibraryPreview) {
  return {
    name: `${data.campaign.name} (copy)`,
    description: data.campaign.description ?? "",
    audience: "Selected contacts",
    durationDays: Math.max(
      1,
      Math.ceil((data.campaign.durationMinutes ?? 0) / 1440) + 1,
    ),
    goals: [],
    steps: data.steps.map((s, i) => ({
      id: s.id,
      order: i + 1,
      type: s.type,
      title: s.title,
      description: s.description ?? "",
      delayMinutes: s.delay_minutes,
      dayLabel: s.day_label ?? undefined,
      timeLabel: s.time_label ?? undefined,
      voiceAssetId:
        s.voice_asset_id ?? (s.conditions?.voiceAssetId as string | undefined),
      attachments: Array.isArray(s.conditions?.attachments)
        ? s.conditions.attachments
        : undefined,
    })),
  };
}
