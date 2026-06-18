"use client";

import { Icon } from "@/components/ui/icon";
import { isInAppBrowser, openInSystemBrowserHint } from "@/lib/detect-in-app-browser";
import { useEffect, useState } from "react";

type InAppBrowserBannerProps = {
  context?: "sign-in" | "google-calendar";
};

export function InAppBrowserBanner({ context = "sign-in" }: InAppBrowserBannerProps) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setVisible(isInAppBrowser());
  }, []);

  if (!visible) return null;

  const title =
    context === "google-calendar"
      ? "Open in Safari or Chrome to connect Google Calendar"
      : "Open in Safari or Chrome to sign in with Google";

  const body =
    context === "google-calendar"
      ? "Google blocks calendar connections inside in-app browsers. Open VoiceReach in your phone’s main browser first, then connect again."
      : "Google blocks sign-in inside Instagram, Facebook, and other in-app browsers. Use email & password here, or open this page in Safari/Chrome to use Google sign-in.";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: select is not ideal on mobile; user can use share sheet manually.
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-left sm:px-5">
      <div className="flex gap-3">
        <Icon name="warning" className="mt-0.5 shrink-0 text-[22px] text-amber-700" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-amber-950">{title}</p>
          <p className="mt-1 text-[14px] leading-relaxed text-amber-900/90">{body}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-amber-800/90">
            {openInSystemBrowserHint()}
          </p>
          <button
            type="button"
            onClick={() => void copyLink()}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-ivory px-4 py-2 text-[13px] font-medium text-amber-950 hover:bg-amber-100"
          >
            <Icon name="content_copy" className="text-[16px]" />
            {copied ? "Link copied — paste in Safari" : "Copy link for Safari"}
          </button>
        </div>
      </div>
    </div>
  );
}
