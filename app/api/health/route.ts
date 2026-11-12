import { apiOk, withApiHandler } from "@/lib/api-response";
import { isLiveOutboundAllowed } from "@/lib/billing/live-outbound";
import { isGoogleCalendarConfigured } from "@/lib/calendar/google";
import {
  getClerkKeyMode,
  hasClerkEnv,
  hasClerkPublishableKey,
  hasClerkSecretKey,
} from "@/lib/clerk-env";
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
    clerkMode: getClerkKeyMode(),
    clerkPublishableKey,
    clerkSecretKey,
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    providers,
    voiceAi: isElevenLabsConfigured(),
    googleCalendar: isGoogleCalendarConfigured(),
    stripe: {
      configured: stripe,
      publishableKey: Boolean(stripePublishableKey()),
    },
    liveSending: isLiveOutboundAllowed() && (providers.voicemail || providers.sms || providers.email),
    liveOutboundAllowed: isLiveOutboundAllowed(),
    message:
      supabase && clerk
        ? "All core services configured."
        : "Some production credentials are missing - dashboard data will not load until they are set on Vercel.",
  });
});
