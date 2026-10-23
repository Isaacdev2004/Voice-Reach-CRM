import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { encryptCalendarToken, decryptCalendarToken } from "./token-crypto";
import { wallTimeToInstant } from "./time";
const ROOT = "https://www.googleapis.com/calendar/v3",
  TOKEN = "https://oauth2.googleapis.com/token";
export const GOOGLE_CALENDAR_SCOPES = [
  "openid",
  "email",
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
export type Recurrence = "none" | "daily" | "weekly" | "monthly";
export function isGoogleCalendarConfigured() {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.APP_BASE_URL
  );
}
export function googleRedirectUri() {
  return (
    process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim().replace(/\/$/, "") ??
    `${process.env.APP_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000"}/api/integrations/google/callback`
  );
}
export function buildGoogleAuthUrl(state: string) {
  return (
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: googleRedirectUri(),
      response_type: "code",
      scope: GOOGLE_CALENDAR_SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
    })
  );
}
async function tokenRequest(params: Record<string, string>) {
  const response = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      ...params,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const raw = await response.json().catch(() => ({}));
    throw Error(
      raw.error === "invalid_grant"
        ? "GOOGLE_RECONNECT_REQUIRED"
        : "Google authorization is temporarily unavailable.",
    );
  }
  return response.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  }>;
}
export const exchangeGoogleCode = (code: string) =>
  tokenRequest({
    code,
    redirect_uri: googleRedirectUri(),
    grant_type: "authorization_code",
  });
export async function getGoogleConnection(
  ownerId: string,
): Promise<CalendarConnection | null> {
  const r = await supabaseAdmin
    .from("calendar_connections")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("provider", "google")
    .maybeSingle();
  if (r.error) throw Error("Calendar connection information is unavailable.");
  return r.data ?? null;
}
export async function revokeGoogleConnection(
  connectionId: string,
  ownerId: string,
) {
  const r = await supabaseAdmin
    .from("calendar_connections")
    .delete()
    .eq("id", connectionId)
    .eq("owner_id", ownerId);
  if (r.error) throw Error("Calendar disconnect failed.");
}
const refreshes = new Map<string, Promise<string>>();
export async function getValidGoogleAccessToken(
  connection: CalendarConnection,
): Promise<string> {
  if (
    connection.expires_at &&
    Date.parse(connection.expires_at) > Date.now() + 60000
  )
    return decryptCalendarToken(connection.access_token);
  if (!connection.refresh_token) throw Error("GOOGLE_RECONNECT_REQUIRED");
  const key = connection.owner_id + ":" + connection.id;
  if (refreshes.has(key)) return refreshes.get(key)!;
  const pending = (async () => {
    const token = await tokenRequest({
      refresh_token: decryptCalendarToken(connection.refresh_token!),
      grant_type: "refresh_token",
    });
    if (!token.access_token || !Number.isFinite(token.expires_in))
      throw Error("Google returned an invalid authorization response.");
    const saved = await supabaseAdmin
      .from("calendar_connections")
      .update({
        access_token: encryptCalendarToken(token.access_token),
        ...(token.refresh_token
          ? { refresh_token: encryptCalendarToken(token.refresh_token) }
          : {}),
        expires_at: new Date(
          Date.now() + token.expires_in * 1000,
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id)
      .eq("owner_id", connection.owner_id);
    if (saved.error)
      throw Error("Refreshed calendar authorization could not be saved.");
    connection.access_token = encryptCalendarToken(token.access_token);
    connection.expires_at = new Date(
      Date.now() + token.expires_in * 1000,
    ).toISOString();
    if (token.refresh_token)
      connection.refresh_token = encryptCalendarToken(token.refresh_token);
    return token.access_token;
  })();
  refreshes.set(key, pending);
  try {
    return await pending;
  } finally {
    refreshes.delete(key);
  }
}
async function request(
  connection: CalendarConnection,
  path: string,
  init: RequestInit = {},
) {
  const access = await getValidGoogleAccessToken(connection);
  const response = await fetch(ROOT + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${access}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (response.status === 401) throw Error("GOOGLE_RECONNECT_REQUIRED");
  if (response.status === 412) throw Error("CALENDAR_CONFLICT");
  if (response.status === 429)
    throw Error("Google Calendar is rate limited. Try again later.");
  return response;
}
export type GoogleCalendarInfo = {
  id: string;
  summary: string;
  accessRole: string;
  backgroundColor?: string;
  primary?: boolean;
  timeZone?: string;
};
export async function listGoogleCalendars(connection: CalendarConnection) {
  const result: GoogleCalendarInfo[] = [];
  let page: string | undefined;
  const seen = new Set<string>();
  do {
    const q = new URLSearchParams({
      maxResults: "250",
      ...(page ? { pageToken: page } : {}),
    });
    const r = await request(connection, `/users/me/calendarList?${q}`);
    if (!r.ok) throw Error("Google calendar discovery failed.");
    const data = await r.json();
    result.push(...(data.items ?? []));
    page = data.nextPageToken;
    if (page && seen.has(page))
      throw Error("Google returned an incomplete calendar list.");
    if (page) seen.add(page);
  } while (page);
  return result;
}
export type GoogleCalendarEventItem = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  htmlLink?: string;
  meetingLink?: string | null;
  source: "google";
  allDay: boolean;
  startDate?: string;
  endDate?: string;
  etag: string;
  calendarId: string;
  recurringEventId?: string;
  originalStart?: string;
  private: boolean;
  busy: boolean;
  editable: boolean;
  localId?: string;
  description?: string;
};
export async function listGoogleCalendarEvents(options: {
  connection: CalendarConnection;
  timeMin: Date;
  timeMax: Date;
  calendarId?: string;
  accessRole?: string;
}) {
  const calendarId =
      options.calendarId ?? options.connection.calendar_id ?? "primary",
    result: GoogleCalendarEventItem[] = [];
  let page: string | undefined;
  const seen = new Set<string>();
  do {
    const q = new URLSearchParams({
      timeMin: options.timeMin.toISOString(),
      timeMax: options.timeMax.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "2500",
      ...(page ? { pageToken: page } : {}),
    });
    const response = await request(
      options.connection,
      `/calendars/${encodeURIComponent(calendarId)}/events?${q}`,
    );
    if (!response.ok) throw Error("Google events could not be synchronized.");
    const json = await response.json();
    for (const item of json.items ?? []) {
      if (item.status === "cancelled") continue;
      const allDay = !!item.start?.date,
        zone = item.start?.timeZone ?? json.timeZone ?? "UTC";
      const starts = allDay
          ? wallTimeToInstant(item.start.date, "00:00", zone, "earlier")
          : item.start?.dateTime,
        ends = allDay
          ? wallTimeToInstant(item.end.date, "00:00", zone, "earlier")
          : item.end?.dateTime;
      if (
        !starts ||
        !ends ||
        !Number.isFinite(Date.parse(starts)) ||
        !Number.isFinite(Date.parse(ends))
      )
        throw Error("Google returned an incomplete event.");
      const privateEvent = item.visibility === "private",
        writable = ["owner", "writer"].includes(options.accessRole ?? "reader");
      result.push({
        id: item.id,
        title: privateEvent ? "Busy" : (item.summary ?? "Untitled event"),
        starts_at: new Date(starts).toISOString(),
        ends_at: new Date(ends).toISOString(),
        allDay,
        startDate: item.start?.date,
        endDate: item.end?.date,
        etag: item.etag,
        calendarId,
        recurringEventId: item.recurringEventId,
        originalStart:
          item.originalStartTime?.dateTime ?? item.originalStartTime?.date,
        private: privateEvent,
        busy: item.transparency !== "transparent",
        editable: writable && !privateEvent,
        htmlLink: item.htmlLink,
        meetingLink: privateEvent
          ? null
          : (item.hangoutLink ??
            (/^https:\/\//.test(item.location ?? "") ? item.location : null)),
        description: privateEvent ? undefined : item.description,
        localId: item.extendedProperties?.private?.myari_event_id,
        source: "google",
      });
    }
    page = json.nextPageToken;
    if (page && seen.has(page))
      throw Error("Google event pagination did not complete.");
    if (page) seen.add(page);
  } while (page);
  return result;
}
export async function getGoogleEvent(
  connection: CalendarConnection,
  eventId: string,
  calendarId = connection.calendar_id,
) {
  const r = await request(
    connection,
    `/calendars/${encodeURIComponent(calendarId || "primary")}/events/${encodeURIComponent(eventId)}`,
  );
  if (r.status === 404 || r.status === 410) return null;
  if (!r.ok) throw Error("Google event could not be verified.");
  return r.json();
}
export async function createGoogleCalendarEvent(options: {
  connection: CalendarConnection;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  timeZone: string;
  recurrence?: Recurrence;
  meetingLink?: string | null;
  eventId?: string;
  localId?: string;
  allDay?: boolean;
  startDate?: string;
  endDate?: string;
}) {
  const calendar = encodeURIComponent(
    options.connection.calendar_id || "primary",
  );
  const eventId = options.eventId ?? crypto.randomUUID().replace(/-/g, "");
  const payload = {
    id: eventId,
    summary: options.title,
    description: options.description,
    location: options.meetingLink ?? undefined,
    start: options.allDay
      ? { date: options.startDate }
      : { dateTime: options.start.toISOString(), timeZone: options.timeZone },
    end: options.allDay
      ? { date: options.endDate }
      : { dateTime: options.end.toISOString(), timeZone: options.timeZone },
    reminders: { useDefault: false, overrides: [] },
    ...(options.recurrence && options.recurrence !== "none"
      ? { recurrence: [`RRULE:FREQ=${options.recurrence.toUpperCase()}`] }
      : {}),
    ...(options.localId
      ? { extendedProperties: { private: { myari_event_id: options.localId } } }
      : {}),
  };
  const r = await request(
    options.connection,
    `/calendars/${calendar}/events?sendUpdates=none`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  if (r.status === 409 && options.localId) {
    const existing = await getGoogleEvent(options.connection, eventId);
    if (
      existing?.extendedProperties?.private?.myari_event_id === options.localId
    )
      return {
        eventId: existing.id,
        htmlLink: existing.htmlLink,
        etag: existing.etag,
      };
  }
  if (!r.ok)
    throw Error(
      "Google event could not be created. The local appointment is preserved.",
    );
  const data = await r.json();
  if (!data.id) throw Error("Google returned no event reference.");
  return {
    eventId: data.id as string,
    htmlLink: data.htmlLink as string | undefined,
    etag: data.etag as string | undefined,
  };
}
export async function updateGoogleCalendarEvent(options: {
  connection: CalendarConnection;
  eventId: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  timeZone: string;
  meetingLink?: string | null;
  etag?: string;
  calendarId?: string;
}) {
  if (!options.etag)
    throw Error("Refresh this Google event before editing it.");
  const r = await request(
    options.connection,
    `/calendars/${encodeURIComponent(options.calendarId ?? options.connection.calendar_id ?? "primary")}/events/${encodeURIComponent(options.eventId)}?sendUpdates=none`,
    {
      method: "PATCH",
      headers: { "If-Match": options.etag },
      body: JSON.stringify({
        summary: options.title,
        description: options.description,
        location: options.meetingLink ?? "",
        start: {
          dateTime: options.start.toISOString(),
          timeZone: options.timeZone,
        },
        end: {
          dateTime: options.end.toISOString(),
          timeZone: options.timeZone,
        },
      }),
    },
  );
  if (!r.ok) throw Error("Google event could not be updated.");
  return r.json();
}
export async function deleteGoogleCalendarEvent(options: {
  connection: CalendarConnection;
  eventId: string;
  etag?: string;
  calendarId?: string;
}) {
  if (!options.etag)
    throw Error("Refresh this Google event before deleting it.");
  const r = await request(
    options.connection,
    `/calendars/${encodeURIComponent(options.calendarId ?? options.connection.calendar_id ?? "primary")}/events/${encodeURIComponent(options.eventId)}?sendUpdates=none`,
    { method: "DELETE", headers: { "If-Match": options.etag } },
  );
  if (!r.ok && r.status !== 404 && r.status !== 410)
    throw Error("Google event could not be deleted.");
}
export async function fetchGoogleAccountEmail(accessToken: string) {
  const r = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) return null;
  const data = await r.json();
  return typeof data.email === "string" ? data.email : null;
}
/** Free/busy-only ACLs authorize availability, not event titles or message details. */
export async function listGoogleBusyIntervals(options: {
  connection: CalendarConnection;
  calendarId: string;
  timeMin: Date;
  timeMax: Date;
}): Promise<GoogleCalendarEventItem[]> {
  const r = await request(options.connection, "/freeBusy", {
    method: "POST",
    body: JSON.stringify({
      timeMin: options.timeMin.toISOString(),
      timeMax: options.timeMax.toISOString(),
      timeZone: "UTC",
      items: [{ id: options.calendarId }],
    }),
  });
  if (!r.ok) throw Error("Google availability could not be verified.");
  const data = await r.json(),
    calendar = data.calendars?.[options.calendarId];
  if (!calendar || calendar.errors?.length || !Array.isArray(calendar.busy))
    throw Error("Google availability could not be verified.");
  return calendar.busy.map((b: { start: string; end: string }) => {
    const start = Date.parse(b.start),
      end = Date.parse(b.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
      throw Error("Google returned incomplete availability.");
    return {
      id: `busy:${start}:${end}`,
      title: "Busy",
      starts_at: new Date(start).toISOString(),
      ends_at: new Date(end).toISOString(),
      source: "google" as const,
      allDay: false,
      etag: "",
      calendarId: options.calendarId,
      private: true,
      busy: true,
      editable: false,
    };
  });
}
