import { apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { isLiveProvidersConfigured, listAdapters } from "@/lib/providers/registry";

export const GET = withApiHandler(async () => {
  await requireUserId();
  const configured = isLiveProvidersConfigured();
  return apiOk({
    configured,
    adapters: listAdapters(),
    canSendLive: configured.voicemail || configured.sms || configured.email,
    missing: {
      voicemail: configured.voicemail
        ? null
        : "Add SLYBROADCAST_USERNAME, SLYBROADCAST_PASSWORD, and SLYBROADCAST_CALLER_ID in Vercel.",
      sms: configured.sms
        ? null
        : "Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER in Vercel.",
      email: configured.email
        ? null
        : "Add RESEND_API_KEY and RESEND_FROM_EMAIL in Vercel.",
    },
  });
});
