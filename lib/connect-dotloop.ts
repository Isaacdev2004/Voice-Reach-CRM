import { isInAppBrowser } from "@/lib/detect-in-app-browser";

export function connectDotloop(): { started: boolean; blocked: boolean } {
  if (typeof window === "undefined") return { started: false, blocked: false };

  if (isInAppBrowser()) {
    return { started: false, blocked: true };
  }

  window.location.assign("/api/integrations/dotloop/connect");
  return { started: true, blocked: false };
}
