"use client";

import { trackMarketingEvent } from "./track";

const FIRED_KEY = "ari_meta_start_trial_fired";
const PENDING_KEY = "ari_meta_start_trial_pending";

export type TrialTrackingPayload = {
  planId: string;
  planPrice: number;
  trialing: boolean;
};

type StartTrialData = {
  planId: string;
  value: number;
};

function readPending(): StartTrialData | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StartTrialData;
  } catch {
    return null;
  }
}

/** Queue StartTrial for the dashboard page load (post-signup redirect). */
export function markTrialStartedPending(data: StartTrialData) {
  if (typeof window === "undefined") return;
  if (window.sessionStorage.getItem(FIRED_KEY)) return;
  window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(data));
}

/** Fire Meta StartTrial once per browser session (deduped). */
export function fireStartTrialOnce(data?: StartTrialData) {
  if (typeof window === "undefined") return;
  if (window.sessionStorage.getItem(FIRED_KEY)) return;

  const payload = data ?? readPending();
  if (!payload) return;

  trackMarketingEvent("trial_started", {
    plan_id: payload.planId,
    value: payload.value,
    currency: "USD",
    content_name: payload.planId,
  });

  window.sessionStorage.setItem(FIRED_KEY, "1");
  window.sessionStorage.removeItem(PENDING_KEY);
}

/** Called on dashboard mount to flush a pending trial event after signup redirect. */
export function consumePendingStartTrial() {
  fireStartTrialOnce();
}

/** After /api/billing/claim succeeds - page load on dashboard, inline if already there. */
export function handleTrialClaimSuccess(payload: TrialTrackingPayload) {
  if (!payload.trialing) return;

  const data: StartTrialData = {
    planId: payload.planId,
    value: payload.planPrice,
  };

  const onDashboard = window.location.pathname.startsWith("/dashboard");
  if (onDashboard) {
    fireStartTrialOnce(data);
  } else {
    markTrialStartedPending(data);
  }
}
