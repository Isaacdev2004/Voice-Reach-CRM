import { evidenceEnabled } from "@/lib/delivery/store";
import { processDeliveryWebhook } from "@/lib/delivery/webhook";
import { apiError, apiSuccess, withApiHandler } from "@/lib/api-response";
import { getAdapter } from "@/lib/providers/registry";
import { recordEngagementEvent } from "@/lib/engagement/record";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isDuplicateProviderWebhook } from "@/lib/webhooks/replay-guard";
import { verifyVoiceWebhookRequest } from "@/lib/webhooks/voice-webhook-auth";
import { NextResponse } from "next/server";

async function handle(request: Request): Promise<NextResponse> {
  if (evidenceEnabled()) {
    const result = await processDeliveryWebhook(
      request,
      new URL(request.url).searchParams.get("provider") ?? "",
    );
    return NextResponse.json(
      { result: result.result },
      { status: result.status },
    );
  }
  if (!verifyVoiceWebhookRequest(request)) {
    return apiError("Unauthorized webhook", {
      status: 401,
      code: "webhook_unauthorized",
    });
  }

  const url = new URL(request.url);
  const providerId = url.searchParams.get("provider") ?? "mock";
  if (!["twilio", "resend", "slybroadcast"].includes(providerId))
    return apiSuccess({ eventType: "unsupported_provider_ignored" });
  const adapter = getAdapter(providerId);

  let raw: Record<string, unknown> = {};
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    raw = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  } else {
    const text = await request.text();
    raw = Object.fromEntries(new URLSearchParams(text));
  }

  const event = adapter.parseWebhook?.(raw);
  if (!event || event.eventType === "unknown")
    return apiSuccess({ provider: adapter.id, eventType: "unknown_ignored" });
  const externalId = event.externalId ?? null;
  if (await isDuplicateProviderWebhook(adapter.id, externalId, event.eventType))
    return apiSuccess({ provider: adapter.id, eventType: "duplicate_ignored" });
  const logged = await supabaseAdmin.from("provider_webhooks").insert({
    provider: adapter.id,
    external_id: externalId,
    event_type: event.eventType,
    raw,
    processed: false,
  });
  if (logged.error?.code === "23505")
    return apiSuccess({ provider: adapter.id, eventType: "duplicate_ignored" });
  if (logged.error)
    return apiError("Webhook logging unavailable.", { status: 503 });

  if (event.campaignId && event.recipientId) {
    const { data: recipient } = await supabaseAdmin
      .from("campaign_recipients")
      .select("owner_id, contact_id, campaign_id")
      .eq("id", event.recipientId)
      .eq("campaign_id", event.campaignId)
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
        eventType: event.eventType,
        channel,
        metadata: { provider: event.provider, raw: event.raw },
      });

      if (
        ["delivered", "listened", "failed", "blocked"].includes(event.eventType)
      ) {
        await supabaseAdmin
          .from("campaign_recipients")
          .update({
            delivery_status:
              event.eventType === "failed"
                ? "failed"
                : event.eventType === "blocked"
                  ? "blocked"
                  : "delivered",
          })
          .eq("id", event.recipientId)
          .eq("owner_id", recipient.owner_id);
      }
    }
  }

  return apiSuccess({ provider: adapter.id, eventType: event.eventType });
}

export const POST = withApiHandler(handle);
export const GET = withApiHandler(async () =>
  apiSuccess({ message: "ARI voice webhook receiver. POST events here." }),
);
