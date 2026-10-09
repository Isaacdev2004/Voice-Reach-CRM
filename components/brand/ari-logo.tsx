"use client";

import { cn } from "@/lib/cn";
import { useState } from "react";

type AriLogoProps = {
  className?: string;
  /** Rendered height in px. */
  height?: number;
};

/**
 * MyARI wordmark. Place the client PNG at `/public/brand/myari-logo.png` (overrides SVG fallback).
 */
export function AriLogo({ className, height = 72 }: AriLogoProps) {
  const [src, setSrc] = useState("/brand/myari-logo.png");

  return (
    // eslint-disable-next-line @next/next/no-img-element -- client PNG + SVG fallback
    <img
      src={src}
      alt="MyARI"
      onError={() => {
        if (src !== "/brand/myari-logo.svg") setSrc("/brand/myari-logo.svg");
      }}
      className={cn("w-auto max-w-[120px] object-contain object-left", className)}
      style={{ height, width: "auto" }}
    />
  );
}

/** Alias for new call sites. */
export const MyAriLogo = AriLogo;
