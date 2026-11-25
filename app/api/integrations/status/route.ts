import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { getClerkKeyMode, hasClerkEnv } from "@/lib/clerk-env";
import {
  probeClerkBackend,
  probeOpenAiConnectivity,
} from "@/lib/integrations/connectivity-probes";
import { getDotloopStatus } from "@/lib/integrations/dotloop";

export const GET = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const probe = new URL(request.url).searchParams.get("probe") === "1";

  if (probe) {
    const expected = process.env.INTEGRATIONS_PROBE_SECRET?.trim();
    if (expected) {
      const provided = request.headers.get("x-integrations-probe-secret")?.trim();
      if (provided !== expected) {
        return apiError("Live connectivity probe not authorized.", {
          status: 403,
          code: "probe_forbidden",
        });
      }
    }
  }

  const dotloop = await getDotloopStatus(ownerId);
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());

  const payload: Record<string, unknown> = {
    claude: {
      configured: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
      model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5",
    },
    openai: {
      configured: openaiConfigured,
    },
    clerk: {
      configured: hasClerkEnv(),
      mode: getClerkKeyMode(),
    },
    dotloop,
  };

  if (probe) {
    const [openaiProbe, clerkProbe] = await Promise.all([
      openaiConfigured ? probeOpenAiConnectivity() : Promise.resolve(null),
      probeClerkBackend(ownerId),
    ]);
    payload.openai = {
      ...(payload.openai as object),
      probe: openaiProbe ?? { ok: false, latencyMs: 0, error: "not_configured" },
    };
    payload.clerk = {
      ...(payload.clerk as object),
      probe: clerkProbe,
    };
  }

  return apiOk(payload);
});
