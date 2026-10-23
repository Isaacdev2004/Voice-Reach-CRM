import React from "react";
import { createRoot } from "react-dom/client";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { CalendarPage } from "../../components/pages/stitch/CalendarPage";
import { DEFAULT_CALENDAR_PREFERENCES } from "../../lib/calendar/preferences";
import { ContactActivityTimeline } from "../../components/activity/contact-activity-timeline";
const w = window;
w.__owner = "owner_a";
w.__requests = [];
w.__fail = false;
w.__failMove = false;
w.__prefs = JSON.parse(sessionStorage.getItem("qa-calendar-prefs") || "{}");
w.__events = JSON.parse(sessionStorage.getItem("qa-calendar-events") || "{}");
w.__setOwner = (owner) => {
  w.__owner = owner;
  w.dispatchEvent(new Event("review:auth"));
};
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const day = "2026-10-22";
const initial = [
  {
    id: id(50),
    crmEventId: id(50),
    title: "Buyer consultation",
    starts_at: day + "T13:00:00.000Z",
    ends_at: day + "T14:00:00.000Z",
    source: "crm",
    calendarKey: "crm",
    contact_id: id(2),
    contactName: "Jordan Lee",
    version: "v1",
    editable: true,
    syncState: "Local appointment",
  },
  {
    id: id(51),
    crmEventId: id(51),
    title: "Listing photography",
    starts_at: day + "T13:30:00.000Z",
    ends_at: day + "T14:30:00.000Z",
    source: "crm",
    calendarKey: "crm",
    version: "v1",
    editable: true,
  },
  {
    id: id(52),
    title: "Prepare client notes",
    starts_at: day + "T16:00:00.000Z",
    ends_at: day + "T16:15:00.000Z",
    source: "task",
    calendarKey: "task",
    contact_id: id(2),
    contactName: "Jordan Lee",
    taskId: id(52),
    busy: false,
  },
  {
    id: id(53),
    title: "Office planning",
    starts_at: day + "T04:00:00.000Z",
    ends_at: "2026-10-23T04:00:00.000Z",
    source: "crm",
    calendarKey: "crm",
    allDay: true,
    busy: false,
    startDate: day,
    endDate: "2026-10-23",
  },
];
const response = (d, status = 200) =>
  new Response(JSON.stringify(d), {
    status,
    headers: { "Content-Type": "application/json" },
  });
w.fetch = async (input, init = {}) => {
  const url = new URL(
    typeof input === "string" ? input : input.url,
    location.origin,
  );
  const path = url.pathname,
    method = init.method ?? "GET",
    body = init.body ? JSON.parse(init.body) : null;
  w.__requests.push({ path, method, body, owner: w.__owner });
  const owner = w.__owner;
  if (path === "/api/calendar/preferences") {
    if (method === "PUT") {
      w.__prefs[owner] = { preferences: body.preferences, version: id(101) };
      sessionStorage.setItem("qa-calendar-prefs", JSON.stringify(w.__prefs));
      return response(w.__prefs[owner]);
    }
    return response(
      w.__prefs[owner] ?? {
        preferences: {
          ...DEFAULT_CALENDAR_PREFERENCES,
          timezone: "America/New_York",
        },
        version: null,
      },
    );
  }
  if (path === "/api/calendar/events" && method === "GET") {
    if (w.__fail) return response({ error: "Unavailable" }, 503);
    if (!w.__events[owner])
      w.__events[owner] = owner === "owner_a" ? structuredClone(initial) : [];
    return response({
      agenda: w.__events[owner],
      authorized: false,
      calendars: [
        {
          key: "crm",
          name: "MyARI appointments",
          color: "#bd9169",
          read: true,
          write: true,
        },
        {
          key: "task",
          name: "Tasks",
          color: "#b97281",
          read: true,
          write: true,
        },
        {
          key: "callback",
          name: "Callbacks",
          color: "#76a68a",
          read: true,
          write: true,
        },
        {
          key: "reminder",
          name: "Reminders",
          color: "#ae8b61",
          read: true,
          write: true,
        },
      ],
      health: [
        {
          provider: "Google Calendar",
          authorized: false,
          status: "Not connected",
          lastAttempt: null,
          lastSuccess: null,
          read: false,
          write: false,
          mode: "Connect your own calendar to verify synchronization.",
        },
        {
          provider: "Apple / iCloud",
          status: "Read-only subscription available after setup",
          authorized: false,
          read: false,
          write: false,
          lastAttempt: null,
          lastSuccess: null,
          mode: "No CalDAV sync configured",
        },
      ],
    });
  }
  if (path === "/api/calendar/events" && method === "POST") {
    const item = {
      id: body.clientRequestId,
      crmEventId: body.clientRequestId,
      title: body.title,
      starts_at: body.startsAt,
      ends_at: body.endsAt,
      source: body.kind,
      calendarKey: body.kind,
      contact_id: body.contactId,
      version: "v1",
      editable: true,
    };
    w.__events[owner].push(item);
    sessionStorage.setItem("qa-calendar-events", JSON.stringify(w.__events));
    return response({ eventId: item.id }, 201);
  }
  if (path.startsWith("/api/calendar/events/") && method === "PATCH") {
    if (w.__failMove) return response({ error: "Conflict" }, 409);
    const item = w.__events[owner].find((i) => i.id === path.split("/").at(-1));
    Object.assign(item, {
      ...(body.title ? { title: body.title } : {}),
      starts_at: body.startsAt ?? item.starts_at,
      ends_at: body.endsAt ?? item.ends_at,
      version: "v2",
    });
    sessionStorage.setItem("qa-calendar-events", JSON.stringify(w.__events));
    return response({ saved: true });
  }
  if (path.startsWith("/api/calendar/events/") && method === "DELETE") {
    w.__events[owner] = w.__events[owner].filter(
      (i) => i.id !== path.split("/").at(-1),
    );
    return response({ deleted: true });
  }
  if (path === "/api/contacts") {
    const contacts =
      owner === "owner_a"
        ? [
            {
              id: id(2),
              owner_id: owner,
              first_name: "Jordan",
              last_name: "Lee",
              phone: "+15555550123",
              email: "jordan@example.test",
              type: "Active Lead",
              category: "Residential",
            },
          ]
        : [];
    return response({
      success: true,
      filtered: contacts.length,
      contacts,
      counts: {
        all: contacts.length,
        coldLead: 0,
        activeLead: contacts.length,
        pastClient: 0,
      },
      total: contacts.length,
      complete: true,
    });
  }
  if (path === "/api/calendar/links")
    return response({ enabled: false, links: [] });
  if (path === "/api/calendar/booking-requests")
    return response({ enabled: false, requests: [] });
  if (path === "/api/activity/priorities")
    return response({
      items:
        owner === "owner_a"
          ? [
              {
                id: id(55),
                title: "Review buyer criteria",
                contact: "Jordan Lee",
                at: day + "T18:00Z",
                status: "Due today",
                href: "/dashboard/contacts/" + id(2),
              },
            ]
          : [],
    });
  if (path.endsWith("/timeline"))
    return response({
      items: [
        {
          id: "appointment:" + id(50),
          type: "appointment",
          title: "Buyer consultation scheduled",
          at: day + "T13:00Z",
          scheduledAt: day + "T13:00Z",
          status: "Scheduled",
          href: "/dashboard/calendar",
        },
        {
          id: "note:" + id(56),
          type: "note",
          title: "Saved buyer preferences",
          at: day + "T12:00Z",
          status: "Saved note",
          detail: "Quiet neighborhood preferred",
        },
      ],
      nextCursor: null,
      limitations: [],
      timezone:"America/New_York",
    });
  if (path.endsWith("/tasks")) return response({ tasks: [] });
  if (path === "/api/health")
    return response({ status: "ok", supabase: true, clerk: true });
  if (path === "/api/settings")
    return response({
      settings: {
        profile: { fullName: "Alex Morgan" },
        billing: { plan: "starter" },
        workspace: { name: "Review workspace" },
      },
    });
  if (path === "/api/notifications")
    return response({ notifications: [], unreadCount: 0 });
  if (path === "/api/tasks") return response({ tasks: [] });
  if (path === "/api/billing/status") return response({});
  return response({});
};
createRoot(document.getElementById("root")).render(
  <DashboardShell>
    {location.search.includes("timeline") ? (
      <ContactActivityTimeline contactId={id(2)} contactName="Jordan Lee" />
    ) : (
      <CalendarPage />
    )}
  </DashboardShell>,
);
