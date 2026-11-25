import { handleInbound } from "@/lib/communications/webhook";
import { managedSmsWebhook } from "@/lib/messaging/isv/webhook";
export const POST = (request: Request) =>
  process.env.MANAGED_SMS_PILOT_ENABLED === "true" ||
  process.env.MANAGED_SMS_WEBHOOKS_ENABLED === "true"
    ? managedSmsWebhook(request)
    : handleInbound(request, "sms");
