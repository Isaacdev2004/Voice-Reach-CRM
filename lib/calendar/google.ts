import { supabaseAdmin } from "@/lib/supabaseAdmin";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR = "https://www.googleapis.com/calendar/v3";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

export type CalendarConnection = {
  id: string;
  owner_id: string;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  calendar_id: string;
  account_email: string | null;
  updated_at?: string | null;
};

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.APP_BASE_URL,
  );
}

export function googleRedirectUri(): string {
  const base = process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  return `${base}/api/integrations/google/callback`;
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: GOOGLE_CALENDAR_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH}?${params}`;
}

export async function exchangeGoogleCode(code: string) {
  const response = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google token exchange failed: ${detail.slice(0, 200)}`);
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
  }>;
}

async function refreshGoogleToken(refreshToken: string) {
  const response = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google token refresh failed: ${detail.slice(0, 200)}`);
  }

  return response.json() as Promise<{
    access_token: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
  }>;
}

export async function getGoogleConnection(ownerId: string): Promise<CalendarConnection | null> {
  const { data } = await supabaseAdmin
    .from("calendar_connections")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("provider", "google")
    .maybeSingle();
  return data ?? null;
}

export async function getValidGoogleAccessToken(
  connection: CalendarConnection,
): Promise<string> {
  const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
  if (Date.now() < expiresAt - 60_000) return connection.access_token;
  if (!connection.refresh_token) return connection.access_token;

  const refreshed = await refreshGoogleToken(connection.refresh_token);
  const nextExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await supabaseAdmin
    .from("calendar_connections")
    .update({
      access_token: refreshed.access_token,
      expires_at: nextExpiry,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return refreshed.access_token;
}

export async function createGoogleCalendarEvent(options: {
  connection: CalendarConnection;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  timeZone: string;
}): Promise<{ eventId: string; htmlLink?: string }> {
  const accessToken = await getValidGoogleAccessToken(options.connection);
  const calendarId = encodeURIComponent(options.connection.calendar_id || "primary");

  const response = await fetch(`${GOOGLE_CALENDAR}/calendars/${calendarId}/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: options.title,
      description: options.description,
      start: { dateTime: options.start.toISOString(), timeZone: options.timeZone },
      end: { dateTime: options.end.toISOString(), timeZone: options.timeZone },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google Calendar event failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const json = (await response.json()) as { id?: string; htmlLink?: string };
  if (!json.id) throw new Error("Google Calendar returned no event id");
  return { eventId: json.id, htmlLink: json.htmlLink };
}

export async function fetchGoogleAccountEmail(accessToken: string): Promise<string | null> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const json = (await response.json()) as { email?: string };
  return json.email ?? null;
}

export type GoogleCalendarEventItem = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  htmlLink?: string;
  source: "google";
};

export async function listGoogleCalendarEvents(options: {
  connection: CalendarConnection;
  timeMin: Date;
  timeMax: Date;
}): Promise<GoogleCalendarEventItem[]> {
  const accessToken = await getValidGoogleAccessToken(options.connection);
  const calendarId = encodeURIComponent(options.connection.calendar_id || "primary");
  const params = new URLSearchParams({
    timeMin: options.timeMin.toISOString(),
    timeMax: options.timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });

  const response = await fetch(
    `${GOOGLE_CALENDAR}/calendars/${calendarId}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Google Calendar list failed (${response.status}): ${detail.slice(0, 200)}`);
  }

  const json = (await response.json()) as {
    items?: {
      id: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      htmlLink?: string;
    }[];
  };

  return (json.items ?? []).map((item) => ({
    id: item.id,
    title: item.summary ?? "Untitled event",
    starts_at: item.start?.dateTime ?? `${item.start?.date}T12:00:00`,
    ends_at: item.end?.dateTime ?? `${item.end?.date}T13:00:00`,
    htmlLink: item.htmlLink,
    source: "google" as const,
  }));
}
