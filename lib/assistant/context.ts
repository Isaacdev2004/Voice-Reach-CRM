import { z } from "zod";
const uuid = z.string().uuid();
/** Record IDs only: never infer identity from rendered text, names or page contents. */
export function pageContext(
  pathname: string,
  search: string,
  selected: Record<string, unknown> = {},
) {
  const q = new URLSearchParams(search),
    context: Record<string, string> = { path: pathname };
  const match = pathname.match(/^\/dashboard\/contacts\/([a-f\d-]+)$/i);
  const fields = [
    "contactId",
    "campaignId",
    "noteId",
    "propertyContactId",
    "taskId",
    "transactionId",
    "voiceAssetId",
    "voiceDraftId",
    "eventId",
  ];
  for (const key of fields) {
    const value =
      selected[key] ??
      q.get(key) ??
      (key === "contactId"
        ? match?.[1]
        : key === "campaignId"
          ? q.get("edit")
          : undefined);
    if (uuid.safeParse(value).success) context[key] = String(value);
  }
  return context;
}
