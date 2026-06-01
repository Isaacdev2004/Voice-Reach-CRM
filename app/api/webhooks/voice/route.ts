import { apiError, apiSuccess, withApiHandler } from "@/lib/api-response";
import { getAdapter } from "@/lib/providers/registry";
import { recordEngagementEvent } from "@/lib/engagement/record";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

async function handle(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const providerId = url.searchParams.get("provider") ?? "mock";
  const adapter = getAdapter(providerId);

  let raw: Record<string, unknown> = {};
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    raw = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  } else {
    const text = await request.text();
    raw = Object.fromEntries(new URLSearchParams(text));
  }

  await supabaseAdmin.from("provider_webhooks").insert({
    provider: adapter.id,
    external_id: (raw.id as string) ?? (raw.MessageSid as string) ?? null,
    event_type: (raw.event_type as string) ?? (raw.status as string) ?? null,
    raw,
    processed: false,
  });

  const event = adapter.parseWebhook?.(raw);
  if (!event) return apiError("Webhook parser missing", { status: 200, code: "parser_missing" });

  if (event.campaignId && event.recipientId) {
    const { data: recipient } = await supabaseAdmin
      .from("campaign_recipients")
      .select("owner_id, contact_id, campaign_id")
      .eq("id", event.recipientId)
      .maybeSingle();

    if (recipient) {
      const channel =
        event.provider === "resend" || event.provider === "twilio"
          ? event.provider === "resend"
            ? "email"
            : "sms"
          : "voicemail";

      await recordEngagementEvent({
        ownerId: recipient.owner_id,
        contactId: recipient.contact_id,
        campaignId: recipient.campaign_id,
        eventType: event.eventType === "unknown" ? "delivered" : event.eventType,
        channel,
        metadata: { provider: event.provider, raw: event.raw },
      });

      if (event.eventType === "delivered" || event.eventType === "listened") {
        await supabaseAdmin
          .from("campaign_recipients")
          .update({ delivery_status: event.eventType === "listened" ? "delivered" : "sent" })
          .eq("id", event.recipientId);
      }
    }
  }

  return apiSuccess({ provider: adapter.id, eventType: event.eventType });
}

export const POST = withApiHandler(handle);
export const GET = withApiHandler(async () =>
  apiSuccess({ message: "VoiceReach voice webhook receiver. POST events here." }),
);
