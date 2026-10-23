import { readCalendarPreferences } from "./preferences-store";
/** Calendar UI and server scheduling/conflict rules must read the same revision. */
export async function loadCalendarPreferences(owner: string) {
  return (await readCalendarPreferences(owner)).preferences;
}
