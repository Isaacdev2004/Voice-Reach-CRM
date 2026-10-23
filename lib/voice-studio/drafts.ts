import { z } from "zod";

export const VoiceDraftSchema = z.object({
  id: z.string().uuid(), title: z.string().trim().min(1).max(120), script: z.string().max(5000),
  category: z.string().max(80).default("General"), archived: z.boolean().default(false),
  revision: z.string().min(1).nullable(), updated_at: z.string(),
});
// Recovery accepts an unfinished title; cloud persistence still requires a non-empty title.
export const VoiceDraftRecoverySchema=VoiceDraftSchema.extend({title:z.string().max(120)});
export type VoiceDraft = z.infer<typeof VoiceDraftSchema>;
export const VoiceDraftSaveSchema = VoiceDraftSchema.omit({revision:true,updated_at:true}).extend({expectedRevision:z.string().min(1).nullable().default(null)}).strict();
export type VoiceDraftSave = z.infer<typeof VoiceDraftSaveSchema>;
export const DRAFT_DOCUMENT_ACTION = "VOICE_SCRIPT_DRAFT_DOCUMENT";
export function sameVoiceDraft(a: Pick<VoiceDraft,"title"|"script"|"category"|"archived">, b: Pick<VoiceDraft,"title"|"script"|"category"|"archived">) {
  return a.title === b.title && a.script === b.script && a.category === b.category && a.archived === b.archived;
}
