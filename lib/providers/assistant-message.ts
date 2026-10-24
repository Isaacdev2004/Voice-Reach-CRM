import { createHash } from "node:crypto";
import { normalizeE164 } from "@/lib/communications/inbound";
export type ApprovedMessage = {
  ownerId: string;
  contactId: string;
  campaignId: string;
  recipientId: string;
  to: string;
  from: string;
  senderIdentity: string;
  provider: string;
  body: string;
  subject: string | null;
};
export function configuredEmailFrom() {
  const raw = process.env.RESEND_FROM_EMAIL?.trim();
  if (!raw || /[\r\n]/.test(raw)) return null;
  return raw.includes("<") && raw.includes(">")
    ? raw
    : raw.includes("@")
      ? `ARI <${raw}>`
      : null;
}
export function senderSnapshot(channel: string) {
  const from =
    channel === "sms"
      ? process.env.TWILIO_FROM_NUMBER?.trim()
      : configuredEmailFrom();
  const account =
    channel === "sms" ? process.env.TWILIO_ACCOUNT_SID?.trim() : "resend";
  return {
    from: from ?? null,
    identity:
      from && account
        ? createHash("sha256")
            .update(JSON.stringify({ channel, from, account }))
            .digest("hex")
        : null,
    scope: "Platform sender, on behalf of your workspace",
  };
}
export function assistantSendAllowedOwner(owner: string) {
  return (
    !!owner &&
    process.env.DELIVERY_EVIDENCE_ENABLED === "true" &&
    !!process.env.ASSISTANT_SEND_RECIPIENTS?.trim() &&
    process.env.ASSISTANT_APPROVED_SENDS_ENABLED === "true" &&
    (process.env.ASSISTANT_SEND_OWNER_IDS ?? "")
      .split(",")
      .map((v) => v.trim())
      .includes(owner)
  );
}
export function assistantSendIssues(
  owner: string,
  channel: string,
  to: string,
) {
  const issues: string[] = [];
  if (process.env.ASSISTANT_APPROVED_SENDS_ENABLED !== "true")
    issues.push("Assistant external delivery is disabled by the release flag.");
  const owners = (process.env.ASSISTANT_SEND_OWNER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!owners.includes(owner))
    issues.push("Messaging is not enabled for this internal beta account.");
  const allowed = (process.env.ASSISTANT_SEND_RECIPIENTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const normalize = (v: string) =>
    channel === "sms" ? normalizeE164(v) : v.toLowerCase();
  if (!allowed.some((v) => normalize(v) === normalize(to)))
    issues.push("This destination is not an approved internal beta recipient.");
  if (process.env.DELIVERY_EVIDENCE_ENABLED !== "true")
    issues.push("Verified delivery evidence must be enabled before messaging.");
  return issues;
}
export function approvedTransportIssues(
  request: import("./types").SendRequest,
  provider: string,
) {
  const a = request.approvedMessage;
  if (!a) return [];
  const issues = assistantSendIssues(
      request.ownerId ?? "",
      request.channel,
      request.to,
    ),
    sender = senderSnapshot(request.channel);
  if (
    a.provider !== provider ||
    a.ownerId !== request.ownerId ||
    a.contactId !== request.contactId ||
    a.campaignId !== request.campaignId ||
    a.recipientId !== request.recipientId ||
    a.to !== request.to ||
    a.body !== request.body ||
    (a.subject ?? null) !== (request.subject ?? null) ||
    a.from !== sender.from ||
    a.senderIdentity !== sender.identity
  )
    issues.push(
      "Approved message, recipient or sender changed. Prepare a fresh preview.",
    );
  return issues;
}
