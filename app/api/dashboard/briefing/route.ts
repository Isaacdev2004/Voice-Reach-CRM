import { z } from "zod";
import {
  apiError,
  apiOk,
  apiSuccess,
  withApiHandler,
} from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import {
  loadPreferences,
  readDocument,
  recordVisit,
} from "@/lib/dashboard/briefing/store";
import { buildPriorities } from "@/lib/dashboard/briefing/sources";
import {
  generateBriefing,
  readBriefing,
  briefingOutput,
} from "@/lib/dashboard/briefing/service";
async function context(request: Request) {
  const owner = await requireUserId();
  if (
    request.headers.get("X-MyARI-Owner") &&
    request.headers.get("X-MyARI-Owner") !== owner
  )
    throw Error("Unauthorized");
  return { owner, ...(await loadPreferences(owner)) };
}
export const GET = withApiHandler(async (request) => {
  try {
    const { owner, preferences, version } = await context(request);
    const [visit, cached] = await Promise.all([
      readDocument(owner, "visit"),
      readBriefing(owner, preferences),
    ]);
    const snapshot = await buildPriorities(
      owner,
      preferences,
      visit?.metadata?.at ?? null,
    );
    return apiOk({
      preferences,
      version,
      snapshot,
      cached,
      schedulerConfigured: Boolean(process.env.CRON_SECRET?.trim()),
      output: briefingOutput(snapshot, cached),
    });
  } catch (e) {
    return apiError(
      e instanceof Error && e.message === "Unauthorized"
        ? "Sign in required."
        : "Your briefing could not be verified. Please retry.",
      {
        status: e instanceof Error && e.message === "Unauthorized" ? 401 : 503,
      },
    );
  }
});
export const POST = withApiHandler(async (request) => {
  try {
    const { owner, preferences } = await context(request);
    const body = z
      .object({ action: z.enum(["generate", "visit"]) })
      .strict()
      .parse(await request.json());
    if (body.action === "visit") {
      await recordVisit(owner, new Date().toISOString());
      return apiOk({ recorded: true });
    }
    const visit = await readDocument(owner, "visit");
    const cached = await generateBriefing(owner, preferences);
    const snapshot = await buildPriorities(
      owner,
      preferences,
      visit?.metadata?.previousAt ?? null,
    );
    return apiSuccess({
      task: "daily_briefing",
      output: briefingOutput(snapshot, cached),
      provider: cached.provider,
      cached,
    });
  } catch (e) {
    if (e instanceof z.ZodError)
      return apiError("Choose a supported briefing action.", { status: 400 });
    return apiError(
      e instanceof Error && e.message === "Unauthorized"
        ? "Sign in required."
        : "The briefing is temporarily unavailable. Your records have not changed.",
      {
        status: e instanceof Error && e.message === "Unauthorized" ? 401 : 503,
      },
    );
  }
});
