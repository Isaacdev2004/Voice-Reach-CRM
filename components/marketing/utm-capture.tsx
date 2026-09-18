"use client";

import { saveUtmAttribution } from "@/lib/marketing/utm";
import { useEffect } from "react";

/** Persists UTM params from the landing URL for signup attribution. */
export function UtmCapture() {
  useEffect(() => {
    saveUtmAttribution();
  }, []);
  return null;
}
