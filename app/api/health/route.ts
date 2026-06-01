import { apiOk, withApiHandler } from "@/lib/api-response";
import { hasClerkEnv } from "@/lib/clerk-env";
import { isLiveProvidersConfigured } from "@/lib/providers/registry";
import { isSupabaseConfigured } from "@/lib/server-config";

export const GET = withApiHandler(async () => {
  const supabase = isSupabaseConfigured();
  const clerk = hasClerkEnv();
  const providers = isLiveProvidersConfigured();

  return apiOk({
    status: supabase && clerk ? "ok" : "degraded",
    supabase,
    clerk,
    providers,
    liveSending: providers.voicemail || providers.sms || providers.email,
    message:
      supabase && clerk
        ? "All core services configured."
        : "Some production credentials are missing — dashboard data will not load until they are set on Vercel.",
  });
});
