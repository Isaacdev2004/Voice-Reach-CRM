/** Shared secret for provider disposition webhooks (append ?token= to SLYBROADCAST_DISPO_URL). */
export function verifyVoiceWebhookRequest(request: Request): boolean {
  const secret = process.env.VOICE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    // Dev / unset: allow (log in production via health checks). Set VOICE_WEBHOOK_SECRET in prod.
    return process.env.NODE_ENV !== "production";
  }

  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  const headerToken =
    request.headers.get("x-voice-webhook-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  return queryToken === secret || headerToken === secret;
}
