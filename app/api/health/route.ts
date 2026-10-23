import { isLiveOutboundAllowed } from "@/lib/billing/live-outbound";
import { apiOk, withApiHandler } from "@/lib/api-response";
import { isGoogleCalendarConfigured } from "@/lib/calendar/google";
import { hasClerkEnv, hasClerkPublishableKey, hasClerkSecretKey } from "@/lib/clerk-env";
import { isElevenLabsConfigured } from "@/lib/providers/elevenlabs";
import { isLiveProvidersConfigured } from "@/lib/providers/registry";
import { isSupabaseConfigured } from "@/lib/server-config";
import { isStripeConfigured, stripePublishableKey } from "@/lib/stripe/config";

export const GET = withApiHandler(async () => {
  const supabase = isSupabaseConfigured();
  const clerkPublishableKey = hasClerkPublishableKey();
  const clerkSecretKey = hasClerkSecretKey();
  const clerk = hasClerkEnv();
  const providers = isLiveProvidersConfigured();
  const stripe = isStripeConfigured();

  return apiOk({
    status: supabase && clerk ? "ok" : "degraded",
    supabase,
    clerk,
    clerkPublishableKey,
    clerkSecretKey,
    providers,
    voiceAi: isElevenLabsConfigured(),
    googleCalendar: isGoogleCalendarConfigured(),
    stripe: {
      configured: stripe,
      publishableKey: Boolean(stripePublishableKey()),
    },
    liveSending: isLiveOutboundAllowed() && (providers.voicemail || providers.sms || providers.email),
    message:
      supabase && clerk
        ? "Core service configuration is present. Connectivity has not been verified."
        : "Some production credentials are missing - dashboard data will not load until they are set on Vercel.",
  });
});
