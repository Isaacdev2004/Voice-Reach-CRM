import type { ActivityLogEntry } from "./types";
export type ActivityScope =
  | "all"
  | "conversations"
  | "campaigns"
  | "contacts"
  | "appointments"
  | "alerts"
  | "today"
  | "replies";
export function activityMatches(
  e: ActivityLogEntry,
  scope: ActivityScope,
  now = new Date(),
) {
  switch (scope) {
    case "conversations":
      return e.category === "engagement" && e.source !== "delivery";
    case "replies":
      return (
        e.action === "SMS_REPLY_RECEIVED" ||
        e.action === "replied" ||
        e.action === "callback"
      );
    case "campaigns":
      return e.category === "campaigns" || e.source === "delivery";
    case "contacts":
      return e.category === "contacts";
    case "appointments":
      return [
        "calendar_event",
        "contact_task",
        "task",
        "task_transaction",
      ].includes(e.entityType ?? "");
    case "alerts":
      return !!e.alert;
    case "today":
      return new Date(e.createdAt).toDateString() === now.toDateString();
    default:
      return true;
  }
}
export function activityKpis(entries: ActivityLogEntry[], now = new Date()) {
  const today = entries.filter((e) => activityMatches(e, "today", now));
  return {
    today: today.filter((e) => e.category !== "system").length,
    replies: entries.filter((e) => activityMatches(e, "replies", now)).length,
    attention: entries.filter((e) => e.alert).length,
    campaigns: entries.filter((e) => activityMatches(e, "campaigns", now))
      .length,
  };
}
export function humanAction(value: string) {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
/** Only whitelisted display metadata reaches business panels. Never show credentials/raw payloads. */
export function safeActivityMetadata(metadata: Record<string, unknown> = {}) {
  const allowed = [
    "status",
    "channel",
    "contactId",
    "campaignId",
    "taskId",
    "eventId",
    "title",
    "name",
    "messageSid",
    "duration",
    "direction",
    "from",
    "to",
    "body",
  ];
  return Object.fromEntries(
    allowed
      .filter((k) =>
        ["string", "number", "boolean"].includes(typeof metadata[k]),
      )
      .map((k) => [k, metadata[k]]),
  );
}
