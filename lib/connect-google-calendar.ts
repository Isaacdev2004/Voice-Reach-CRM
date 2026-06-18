import { isInAppBrowser } from "@/lib/detect-in-app-browser";

export function connectGoogleCalendar(): { started: boolean; blocked: boolean } {
  if (typeof window === "undefined") return { started: false, blocked: false };

  if (isInAppBrowser()) {
    return { started: false, blocked: true };
  }

  window.location.assign("/api/integrations/google/authorize");
  return { started: true, blocked: false };
}
