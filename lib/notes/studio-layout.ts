export type StudioPanels = { library: boolean; planner: boolean };
export const DEFAULT_STUDIO_PANELS: StudioPanels = {library: false, planner: false};
export function readStudioPanels(value: string | null): StudioPanels {
  try {
    const parsed = JSON.parse(value ?? "null");
    const planner = parsed?.planner ?? parsed?.context;
    if (typeof parsed?.library === "boolean" && typeof planner === "boolean")
      return {library: parsed.library, planner};
  } catch {}
  return {...DEFAULT_STUDIO_PANELS};
}
export function studioStorageKey(owner: string) { return `myari:notes:studio:v2:${owner}`; }
