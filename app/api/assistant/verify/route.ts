import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getClerkKeyMode, hasClerkEnv } from "@/lib/clerk-env";
import { assistantPreflightMustStayDisabled, probeOpenAiResponses } from "@/lib/assistant/openai-responses-probe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/server-config";

function requireProbeSecret(request: Request) {
  const expected = process.env.INTEGRATIONS_PROBE_SECRET?.trim();
  if (!expected) return null;
  const provided = request.headers.get("x-integrations-probe-secret")?.trim();
  if (provided !== expected) {
    return apiError("Verification probe not authorized.", {
      status: 403,
      code: "probe_forbidden",
    });
  }
  return null;
}

/** Signed-in owner workspace + Clerk linkage (for allowlist setup). Auth only — no probe secret. */
export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();
  const clerkMode = getClerkKeyMode();

  let primaryEmailVerified: boolean | null = null;
  let accountBanned: boolean | null = null;
  if (hasClerkEnv()) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(ownerId);
      accountBanned = Boolean(user.banned);
      const primary =
        user.emailAddresses.find((a) => a.id === user.primaryEmailAddressId) ??
        user.emailAddresses[0];
      primaryEmailVerified = primary?.verification?.status === "verified";
    } catch {
      primaryEmailVerified = null;
    }
  }

  let contactCount: number | null = null;
  if (isSupabaseConfigured()) {
    const { count, error } = await supabaseAdmin
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", ownerId);
    if (!error) contactCount = count ?? 0;
  }

  const { userId: sessionUserId } = await auth();

  return apiOk({
    clerkUserId: ownerId,
    sessionMatchesOwner: sessionUserId === ownerId,
    clerkMode,
    clerkBackendReachable: hasClerkEnv() && primaryEmailVerified !== null,
    primaryEmailVerified,
    accountBanned,
    myariWorkspace: {
      supabaseHost: isSupabaseConfigured() ? new URL(getSupabaseEnv().url).hostname : null,
      contactCount,
      ownerScoped: true,
    },
    assistantPreflight: {
      flagsOk: assistantPreflightMustStayDisabled() === null,
      blockReason: assistantPreflightMustStayDisabled(),
    },
  });
});

/** Private OpenAI Responses API connectivity (server-side key only). */
export const POST = withApiHandler(async (request) => {
  const denied = requireProbeSecret(request);
  if (denied) return denied;

  await requireUserId();

  const block = assistantPreflightMustStayDisabled();
  if (block) {
    return apiError("Preflight refused: change Assistant or billing flags before connectivity test.", {
      status: 409,
      code: block,
    });
  }

  const openai = await probeOpenAiResponses();
  if (!openai.success) {
    return apiError("OpenAI Responses probe did not succeed.", {
      status: openai.configured ? 502 : 503,
      code: openai.error ?? "probe_failed",
      details: {
        configured: openai.configured,
        model: openai.model,
        status: openai.status,
      },
    });
  }

  return apiOk({
    openai: {
      success: true,
      model: openai.model,
      inputTokens: openai.inputTokens,
      outputTokens: openai.outputTokens,
      scope: "responses_api_only; no CRM tools or subscriber activation",
    },
  });
});
