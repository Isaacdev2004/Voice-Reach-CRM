import { z } from "zod";
import { isPropertySearchUrl } from "./zillow";

export const PropertyHistorySchema = z.object({
  eventId: z.string().uuid(),
  contactId: z.string().uuid().nullable(),
  kind: z.enum(["search_requested", "link_copied", "email_composer_opened", "sms_composer_opened"]),
  url: z.string().max(2000).refine(isPropertySearchUrl),
}).strict();
export type PropertyHistoryInput = z.infer<typeof PropertyHistorySchema>;
export type PropertyHistoryEntry = { id: string; created_at: string; entity_id: string | null; metadata: { kind: PropertyHistoryInput["kind"]; url: string } };
export const PROPERTY_HISTORY_LABELS: Record<PropertyHistoryInput["kind"], string> = {
  search_requested: "Zillow search requested",
  link_copied: "Search link copied",
  email_composer_opened: "Email composer opened",
  sms_composer_opened: "Text composer opened",
};
