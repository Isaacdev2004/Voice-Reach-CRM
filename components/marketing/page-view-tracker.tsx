"use client";

import { trackMarketingEvent } from "@/lib/marketing/track";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Fires page_view on marketing route changes for analytics. */
export function PageViewTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/dashboard")) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackMarketingEvent("page_view", { path: pathname });
  }, [pathname]);

  return null;
}
