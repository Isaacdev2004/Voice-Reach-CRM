export const CHANNELS = ["sms", "email", "voicemail"] as const;
export type DeliveryChannel = (typeof CHANNELS)[number];
export const EVENT_TYPES = [
  "queued",
  "submitted",
  "accepted",
  "sent",
  "delivered",
  "failed",
  "undelivered",
  "bounced",
  "rejected",
  "opened",
  "clicked",
  "replied",
  "opt_out",
  "listened",
  "callback",
] as const;
export type DeliveryEventType = (typeof EVENT_TYPES)[number];
export type DeliveryEvent = {
  id: string;
  owner_id: string;
  message_id: string;
  provider: string;
  event_key: string;
  event_type: DeliveryEventType;
  occurred_at: string | null;
  received_at: string;
  source: "submission" | "webhook" | "reconciliation";
  error_code: string | null;
};
export type DeliveryMessage = {
  id: string;
  owner_id: string;
  logical_key: string;
  provider: string;
  channel: DeliveryChannel;
  campaign_id: string | null;
  contact_id: string | null;
  recipient_id: string | null;
  step_id: string | null;
  provider_message_id: string | null;
  created_at: string;
  subject: string | null;
  body: string | null;
  submission_status: "pending" | "accepted" | "failed" | "unknown";
  error_code: string | null;
};
export type SyncRun = {
  id: string;
  owner_id: string;
  provider: string;
  channel: DeliveryChannel;
  attempted_at: string;
  succeeded_at: string | null;
  error_code: string | null;
};
export type MessageRecord = DeliveryMessage & {
  contact: string;
  campaign: string;
  step: string;
  events: DeliveryEvent[];
  status: string;
  indicator: string;
  submittedAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  lastWebhookAt: string | null;
  lastSyncAt: string | null;
  failure: { explanation: string; guidance: string } | null;
};
export type ChannelHealth = {
  channel: DeliveryChannel;
  provider: string;
  configured: boolean;
  confirmationSupported: boolean;
  status:
    | "Connected"
    | "Sync Delayed"
    | "Connection Error"
    | "Status Unavailable"
    | "Not Configured";
  lastSuccessfulSync: string | null;
  lastAttemptedSync: string | null;
  latestWebhook: string | null;
  pendingUpdates: number;
  syncError: string | null;
  mode: "webhook-only" | "webhook + manual reconciliation";
};
