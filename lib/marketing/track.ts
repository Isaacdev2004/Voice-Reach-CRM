"use client";

import { readUtmAttribution } from "./utm";

export type MarketingEvent =
  | "page_view"
  | "cta_click"
  | "start_trial_click"
  | "signup_started"
  | "checkout_started"
  | "demo_video_play";

type EventProps = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function metaEvent(name: string, props?: EventProps) {
  if (typeof window === "undefined" || !window.fbq) return;
  const map: Record<string, string> = {
    page_view: "PageView",
    cta_click: "Lead",
    start_trial_click: "Lead",
    signup_started: "CompleteRegistration",
    checkout_started: "InitiateCheckout",
    demo_video_play: "ViewContent",
  };
  const event = map[name] ?? "Lead";
  window.fbq("track", event, props ?? {});
}

function gaEvent(name: string, props?: EventProps) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", name, props ?? {});
}

/** Unified marketing event — Meta Pixel + GA4 when configured */
export function trackMarketingEvent(name: MarketingEvent, props: EventProps = {}) {
  if (typeof window === "undefined") return;
  const utm = readUtmAttribution();
  const payload = { ...utm, ...props, event: name };

  metaEvent(name, payload);
  gaEvent(name, payload);

  if (process.env.NODE_ENV === "development") {
    console.debug("[marketing]", name, payload);
  }
}
