import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const DOTLOOP_SCOPES = [
  "account:read",
  "profile:read",
  "loop:read",
  "loop:write",
  "contact:read",
].join(" ");

export function isDotloopConfigured() {
  return Boolean(process.env.DOTLOOP_CLIENT_ID?.trim() && process.env.DOTLOOP_CLIENT_SECRET?.trim());
}

export function appBaseUrl() {
  return (
    process.env.APP_BASE_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://voice-reach-crm.vercel.app"
  );
}

export function dotloopRedirectUri() {
  return `${appBaseUrl()}/api/integrations/dotloop/callback`;
}

export function buildDotloopAuthUrl(state: string) {
  const url = new URL("https://auth.dotloop.com/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.DOTLOOP_CLIENT_ID!.trim());
  url.searchParams.set("redirect_uri", dotloopRedirectUri());
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_on_deny", "true");
  return url.toString();
}

function basicAuthHeader() {
  const id = process.env.DOTLOOP_CLIENT_ID!.trim();
  const secret = process.env.DOTLOOP_CLIENT_SECRET!.trim();
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

export async function exchangeDotloopCode(code: string) {
  const tokenUrl = new URL("https://auth.dotloop.com/oauth/token");
  tokenUrl.searchParams.set("grant_type", "authorization_code");
  tokenUrl.searchParams.set("code", code);
  tokenUrl.searchParams.set("redirect_uri", dotloopRedirectUri());

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { Authorization: basicAuthHeader() },
  });
  const json = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "Dotloop token exchange failed");
  }
  return json as { access_token: string; refresh_token?: string; expires_in?: number };
}

export async function fetchDotloopAccountLabel(accessToken: string) {
  const response = await fetch("https://api-gateway.dotloop.com/public/v2/account", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return "Dotloop account";
  const json = (await response.json().catch(() => ({}))) as {
    data?: { email?: string; firstName?: string; lastName?: string };
    email?: string;
  };
  return json.data?.email || json.email || "Dotloop account";
}

export async function getDotloopConnection(ownerId: string) {
  const { data } = await supabaseAdmin
    .from("integration_connections")
    .select("owner_id, provider, account_label, expires_at, updated_at")
    .eq("owner_id", ownerId)
    .eq("provider", "dotloop")
    .maybeSingle();
  return data;
}

export async function upsertDotloopConnection(params: {
  ownerId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number;
  accountLabel?: string | null;
}) {
  const expiresAt = params.expiresIn
    ? new Date(Date.now() + params.expiresIn * 1000).toISOString()
    : new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

  return supabaseAdmin.from("integration_connections").upsert(
    {
      owner_id: params.ownerId,
      provider: "dotloop",
      access_token: params.accessToken,
      refresh_token: params.refreshToken ?? null,
      expires_at: expiresAt,
      account_label: params.accountLabel ?? null,
      scopes: DOTLOOP_SCOPES.split(" "),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_id,provider" },
  );
}

export async function deleteDotloopConnection(ownerId: string) {
  return supabaseAdmin
    .from("integration_connections")
    .delete()
    .eq("owner_id", ownerId)
    .eq("provider", "dotloop");
}
