export type ActivityItem = {
  id: string;
  type: string;
  title: string;
  at: string;
  status: string;
  href?: string;
  scheduledAt?: string;
  detail?: string;
  suggestion?: {
    text: string;
    action: "task" | "calendar" | "property" | "campaign";
  };
};
export function timelinePage(
  items: ActivityItem[],
  cursor: string | null,
  limit = 25,
) {
  const sorted = [
    ...new Map(
      items
        .filter((i) => Number.isFinite(Date.parse(i.at)))
        .map((i) => [i.id, i]),
    ).values(),
  ].sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));
  const after = cursor
    ? sorted.filter((i) => `${i.at}|${i.id}` < cursor)
    : sorted;
  const page = after.slice(0, limit);
  return {
    items: page,
    nextCursor:
      after.length > limit ? `${page.at(-1)!.at}|${page.at(-1)!.id}` : null,
  };
}
export function appointmentSuggestion(metadata: Record<string, unknown>) {
  if (metadata.status === "missed")
    return {
      text: "A missed appointment was recorded. Consider offering a new time.",
      action: "calendar" as const,
    };
  if (metadata.status !== "completed") return undefined;
  switch (metadata.appointmentType) {
    case "showing":
      return {
        text: "A completed showing was recorded. Consider requesting feedback or scheduling a follow-up.",
        action: "task" as const,
      };
    case "buyer_consultation":
      return {
        text: "A completed buyer consultation was recorded. Review the saved property preferences.",
        action: "property" as const,
      };
    case "listing_appointment":
      return {
        text: "A completed listing appointment was recorded. Consider a seller follow-up task.",
        action: "task" as const,
      };
    default:
      return undefined;
  }
}
