import { apiOk, withApiHandler } from "@/lib/api-response";
import { isGoogleCalendarConfigured } from "@/lib/calendar/google";
import { hasClerkEnv } from "@/lib/clerk-env";
import { isElevenLabsConfigured } from "@/lib/providers/elevenlabs";
import { isLiveProvidersConfigured } from "@/lib/providers/registry";
import { isSupabaseConfigured } from "@/lib/server-config";
import { isStripeConfigured, stripePublishableKey } from "@/lib/stripe/config";

export const GET = withApiHandler(async () => {
  const supabase = isSupabaseConfigured();
  const clerk = hasClerkEnv();
  const providers = isLiveProvidersConfigured();
  const stripe = isStripeConfigured();

  return apiOk({
    status: supabase && clerk ? "ok" : "degraded",
    supabase,
    clerk,
    providers,
    voiceAi: isElevenLabsConfigured(),
    googleCalendar: isGoogleCalendarConfigured(),
    stripe: {
      configured: stripe,
      publishableKey: Boolean(stripePublishableKey()),
    },
    liveSending: providers.voicemail || providers.sms || providers.email,
    message:
      supabase && clerk
        ? "All core services configured."
        : "Some production credentials are missing — dashboard data will not load until they are set on Vercel.",
  });
});
