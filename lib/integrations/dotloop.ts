import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { decryptDotloopToken, dotloopEncryptionReady, encryptDotloopToken } from "./dotloop-crypto";
import { createDotloopLifecycle, DotloopError, dotloopStatus, type DotloopRecord, type DotloopTokens } from "./dotloop-lifecycle";

export const DOTLOOP_SCOPES = ["account:read", "profile:read", "loop:read", "contact:read"].join(" ");
export function isDotloopConfigured() {
  return Boolean(process.env.DOTLOOP_CLIENT_ID?.trim() && process.env.DOTLOOP_CLIENT_SECRET?.trim() && dotloopEncryptionReady());
}
export function appBaseUrl() {
  return process.env.APP_BASE_URL?.replace(/\/$/, "") || process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://myari.io";
}
export function dotloopRedirectUri() { return `${appBaseUrl()}/api/integrations/dotloop/callback`; }
export function buildDotloopAuthUrl(state: string) {
  const url = new URL("https://auth.dotloop.com/oauth/authorize");
  url.search = new URLSearchParams({ response_type: "code", client_id: process.env.DOTLOOP_CLIENT_ID!.trim(),
    redirect_uri: dotloopRedirectUri(), state, redirect_on_deny: "true" }).toString();
  // Scopes are assigned to registered Dotloop applications; record the actual grant, not this desired list.
  return url.toString();
}
function basicAuthHeader() {
  const id = process.env.DOTLOOP_CLIENT_ID?.trim(), secret = process.env.DOTLOOP_CLIENT_SECRET?.trim();
  if (!id || !secret) throw new DotloopError("dotloop_not_configured");
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}
async function tokenRequest(params: Record<string, string>): Promise<DotloopTokens> {
  // Query encoding follows the documented Dotloop API. Never log URL or response bodies.
  const url = new URL("https://auth.dotloop.com/oauth/token"); url.search = new URLSearchParams(params).toString();
  try {
    const response = await fetch(url, { method: "POST", headers: { Authorization: basicAuthHeader() },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw Error();
    const json = await response.json();
    if (typeof json.access_token !== "string" || !json.access_token || json.access_token.length > 16384 ||
      typeof json.expires_in !== "number" || !Number.isFinite(json.expires_in) || json.expires_in <= 0 || json.expires_in > 604800 ||
      (json.refresh_token !== undefined && (typeof json.refresh_token !== "string" || !json.refresh_token || json.refresh_token.length > 16384))) throw Error();
    return { access_token: json.access_token, refresh_token: json.refresh_token, expires_in: json.expires_in,
      scope: typeof json.scope === "string" ? json.scope.split(/[\s,]+/).filter(Boolean) : [] };
  } catch { throw new DotloopError("dotloop_authorization_failed", 409); }
}
export const exchangeDotloopCode = (code: string) => tokenRequest({ grant_type: "authorization_code", code, redirect_uri: dotloopRedirectUri() });
async function revokeDotloopToken(token: string) {
  const url = new URL("https://auth.dotloop.com/oauth/token/revoke"); url.searchParams.set("token", token);
  try {
    const response = await fetch(url, { method: "POST", headers: { Authorization: basicAuthHeader() },
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw Error();
  } catch { throw new DotloopError("dotloop_revocation_pending", 409); }
}
export async function fetchDotloopAccountLabel(accessToken: string) {
  try {
    const response = await fetch("https://api-gateway.dotloop.com/public/v2/account", {
      headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw Error();
    const json = await response.json();
    return String(json.data?.email || json.email || "Dotloop account").slice(0,320);
  } catch { throw new DotloopError("dotloop_account_verification_failed", 409); }
}
const metadataColumns = "owner_id,provider,account_label,expires_at,updated_at,credential_version,connection_state,operation_kind,operation_until";
export async function getDotloopConnection(ownerId: string) {
  const { data, error } = await supabaseAdmin.from("integration_connections").select(metadataColumns)
    .eq("owner_id", ownerId).eq("provider", "dotloop").maybeSingle();
  if (error) throw new DotloopError("dotloop_storage_unavailable");
  return data;
}
async function readCredentials(ownerId: string): Promise<DotloopRecord | null> {
  const { data, error } = await supabaseAdmin.from("integration_connections")
    .select(`${metadataColumns},access_token_ciphertext,refresh_token_ciphertext`)
    .eq("owner_id", ownerId).eq("provider", "dotloop").maybeSingle();
  if (error) throw new DotloopError("dotloop_storage_unavailable");
  return data as DotloopRecord | null;
}
export async function getDotloopStatus(owner: string) {
  try { return dotloopStatus(await readCredentials(owner), isDotloopConfigured()); }
  catch { return { configured: isDotloopConfigured(), connected: false, state: "storage_unavailable", accountLabel: null, lastUpdated: null }; }
}
export async function upsertDotloopConnection(params: {
  ownerId: string; accessToken: string; refreshToken?: string | null; expiresIn: number; accountLabel?: string | null; scopes: string[];
}) {
  const { error } = await supabaseAdmin.rpc("store_dotloop_connection", {
    p_owner: params.ownerId, p_access: encryptDotloopToken(params.ownerId, "access", params.accessToken),
    p_refresh: params.refreshToken ? encryptDotloopToken(params.ownerId, "refresh", params.refreshToken) : null,
    p_expires: new Date(Date.now() + params.expiresIn * 1000).toISOString(),
    p_label: params.accountLabel ?? null, p_scopes: params.scopes,
  });
  if (error) throw new DotloopError("dotloop_storage_unavailable");
}
const lifecycle = createDotloopLifecycle({
  read: readCredentials, encrypt: encryptDotloopToken, decrypt: decryptDotloopToken,
  uuid: () => crypto.randomUUID(), now: () => Date.now(),
  refresh: token => tokenRequest({ grant_type: "refresh_token", refresh_token: token }), revoke: revokeDotloopToken,
  async claim(owner, lease, operation) {
    const { data, error } = await supabaseAdmin.rpc("claim_dotloop_operation", { p_owner: owner, p_lease: lease, p_operation: operation });
    if (error) throw new DotloopError("dotloop_storage_unavailable");
    return data as DotloopRecord | null;
  },
  async finish(owner, lease, version, operation, state, tokens) {
    const { data, error } = await supabaseAdmin.rpc("finish_dotloop_operation", {
      p_owner: owner, p_lease: lease, p_version: version, p_operation: operation, p_state: state,
      p_access: tokens?.access ?? null, p_refresh: tokens?.refresh ?? null,
      p_expires: tokens?.expiresAt ?? null, p_scopes: tokens?.scopes ?? [],
    });
    if (error) throw new DotloopError("dotloop_storage_unavailable");
    return data === true;
  },
});
export const getValidDotloopAccessToken = lifecycle.accessToken;
export const disconnectDotloop = lifecycle.disconnect;
