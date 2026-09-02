/**
 * Global kill-switch for real SMS / ringless voicemail / email delivery.
 *
 * When ALLOW_LIVE_OUTBOUND is not exactly "true", ARI stays in demo-safe mode:
 * - Cron / scheduler will not fire live Slybroadcast / Twilio / Resend sends
 * - Live campaign send + live test-run APIs refuse to deliver
 * - New campaigns default to Simulation (mock)
 *
 * Set ALLOW_LIVE_OUTBOUND=true in Vercel only when the client is ready to go live.
 */
export function isLiveOutboundAllowed(): boolean {
  return process.env.ALLOW_LIVE_OUTBOUND?.trim().toLowerCase() === "true";
}

export function liveOutboundBlockedMessage(): string {
  return (
    "Live outbound is paused while ARI is in demo mode. " +
    "Campaigns stay in Simulation so nothing hits real phones. " +
    "When you're ready to go live, set ALLOW_LIVE_OUTBOUND=true in Vercel and switch the campaign to Live."
  );
}

export function isLiveCampaignProvider(provider: string | null | undefined): boolean {
  const id = (provider ?? "").trim().toLowerCase();
  return Boolean(id) && id !== "mock";
}
