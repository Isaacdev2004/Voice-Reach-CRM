"use client";

import { consumePendingStartTrial } from "@/lib/marketing/trial-tracking";
import { useEffect } from "react";

/** Fires Meta StartTrial on dashboard load when a trial was just claimed off-page. */
export function StartTrialTracker() {
  useEffect(() => {
    consumePendingStartTrial();
  }, []);

  return null;
}
