import { loadPreferences, readDocument } from "@/lib/dashboard/briefing/store";
import { buildPriorities } from "@/lib/dashboard/briefing/sources";
import { readBriefing } from "@/lib/dashboard/briefing/service";
export async function readPriorities(owner: string) {
  const { preferences } = await loadPreferences(owner),
    [visit, cached] = await Promise.all([
      readDocument(owner, "visit"),
      readBriefing(owner, preferences),
    ]);
  return {
    snapshot: await buildPriorities(
      owner,
      preferences,
      visit?.metadata?.at ?? null,
    ),
    cached,
    source: "/dashboard",
    limitation:
      "Uses existing verified priority sources and cache; reading does not generate a paid AI briefing.",
  };
}
