/* Synthetic service boundaries only: no environment credentials, provider calls, or production writes. */
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { fixture, id, owner } = require("./campaign-audit/harness.cjs");
const iso = "2026-10-23T14:00:00.000Z",
  end = "2026-10-23T15:00:00.000Z";
function setup() {
  const f = fixture();
  f.tables.contacts.push(structuredClone(f.contact));
  return f;
}
test("DST rejects nonexistent and ambiguous local times; explicit folds resolve distinctly", () => {
  const t = fixture().load("lib/calendar/time");
  assert.throws(
    () => t.wallTimeToInstant("2026-03-08", "02:30", "America/New_York"),
    /does not exist/,
  );
  assert.throws(
    () => t.wallTimeToInstant("2026-11-01", "01:30", "America/New_York"),
    /twice/,
  );
  const a = t.wallTimeToInstant(
      "2026-11-01",
      "01:30",
      "America/New_York",
      "earlier",
    ),
    b = t.wallTimeToInstant("2026-11-01", "01:30", "America/New_York", "later");
  assert.equal(Date.parse(b) - Date.parse(a), 3600000);
  assert.equal(
    t.zonedParts(
      t.wallTimeToInstant("2026-10-23", "09:00", "Asia/Kathmandu"),
      "Asia/Kathmandu",
    ).time,
    "09:00",
  );
  assert.throws(() => t.wallTimeToInstant("2026-02-30", "09:00", "UTC"));
});
test("monthly recurrence skips nonexistent month days; weekly recurrence preserves local clock through DST", () => {
  const f = fixture(),
    r = f.load("lib/calendar/recurrence"),
    t = f.load("lib/calendar/time");
  const dates = r.expandRecurrenceOccurrences({
    start: new Date("2026-01-31T14:00Z"),
    end: new Date("2026-01-31T15:00Z"),
    recurrence: "monthly",
    timeZone: "America/New_York",
  });
  assert.equal(dates[1].start.toISOString().slice(0, 10), "2026-03-31");
  const weekly = r.expandRecurrenceOccurrences({
    start: new Date("2026-03-01T14:00Z"),
    end: new Date("2026-03-01T15:00Z"),
    recurrence: "weekly",
    timeZone: "America/New_York",
  });
  assert.equal(t.zonedParts(weekly[1].start, "America/New_York").time, "09:00");
  assert.equal(weekly[1].start.getUTCHours(), 13);
});
test("private conflicts mask details; adjacent slots are free unless real configured buffers apply; overlap layout assigns columns", () => {
  const c = fixture().load("lib/calendar/conflicts");
  const items = [
    {
      id: "a",
      title: "Sensitive appointment",
      starts_at: iso,
      ends_at: end,
      private: true,
      source: "google",
    },
  ];
  assert.equal(
    c.conflictsFor(items, "2026-10-23T14:30Z", "2026-10-23T15:30Z")[0].title,
    "Busy",
  );
  assert.equal(c.conflictsFor(items, end, "2026-10-23T16:00Z").length, 0);
  assert.equal(
    c.conflictsFor(items, end, "2026-10-23T16:00Z", { bufferBefore: 15 })
      .length,
    1,
  );
  const lanes = c.placeIntervals([
    { id: "a", top: 0, bottom: 60 },
    { id: "b", top: 30, bottom: 90 },
    { id: "c", top: 90, bottom: 120 },
  ]);
  assert.deepEqual(
    lanes.map((x) => x.lanes),
    [2, 2, 1],
  );
});
test("create rejects foreign contact, invalid duration, duplicate retry; writes actual contact ID without automatic provider calls", async () => {
  const f = setup(),
    create = f.load("lib/calendar/create-event").createOwnerCalendarEvent;
  await assert.rejects(
    create({
      ownerId: owner,
      title: "Viewing",
      startsAt: iso,
      endsAt: end,
      contactId: id(99),
    }),
    /Contact not found/,
  );
  await assert.rejects(
    create({ ownerId: owner, title: "Viewing", startsAt: end, endsAt: iso }),
  );
  const p = {
    ownerId: owner,
    title: "Viewing",
    startsAt: iso,
    endsAt: end,
    contactId: id(2),
    clientRequestId: id(50),
  };
  const a = await create(p),
    b = await create(p);
  assert.equal(a.eventId, b.eventId);
  assert.equal(f.tables.calendar_events.length, 1);
  assert.equal(f.tables.calendar_events[0].contact_id, id(2));
  assert.equal(f.tables.calendar_events[0].provider, "local");
  assert.equal(b.alreadySaved, true);
  assert.equal(f.payloads.length, 0);
  await assert.rejects(
    create({ ...p, clientRequestId: id(51) }),
    /CALENDAR_OVERLAP/,
  );
});
test("calendar read includes spanning/all-day events, actual tasks, and excludes other subscribers and mirrored tasks", async () => {
  const f = setup();
  f.tables.calendar_events.push(
    {
      id: id(50),
      owner_id: owner,
      title: "Spanning",
      starts_at: "2026-10-22T00:00Z",
      ends_at: "2026-10-25T00:00Z",
      provider: "local",
      created_at: iso,
      metadata: {
        allDay: true,
        startDate: "2026-10-22",
        endDate: "2026-10-25",
      },
      contact_id: id(2),
    },
    {
      id: id(51),
      owner_id: "foreign",
      title: "Secret",
      starts_at: iso,
      ends_at: end,
      metadata: {},
      created_at: iso,
    },
  );
  f.tables.contact_tasks.push({
    id: id(60),
    owner_id: owner,
    contact_id: id(2),
    title: "Due task",
    due_at: iso,
    completed: false,
  });
  const read = await f
    .load("lib/calendar/read-model")
    .readCalendar(owner, iso, end);
  assert.equal(read.agenda.length, 2);
  assert.equal(read.agenda[0].allDay, true);
  assert(!JSON.stringify(read).includes("Secret"));
  assert.equal(read.connected, false);
  assert.equal(read.agenda.find((i) => i.source === "task").busy, false);
});
test("edit and deletion require owned version; failures preserve local records; stale updates do not apply", async () => {
  const f = setup();
  f.tables.calendar_events.push({
    id: id(50),
    owner_id: owner,
    title: "Viewing",
    starts_at: iso,
    ends_at: end,
    created_at: iso,
    provider: "local",
    metadata: { version: "v1" },
  });
  const manage = f.load("lib/calendar/manage-event");
  await assert.rejects(
    manage.updateOwnerCalendarEvent({
      ownerId: owner,
      eventId: id(50),
      version: "old",
      title: "Wrong",
    }),
    /CALENDAR_CONFLICT/,
  );
  await assert.rejects(
    manage.deleteOwnerCalendarEvent({
      ownerId: "foreign",
      eventId: id(50),
      version: "v1",
    }),
    /NOT_FOUND/,
  );
  await manage.updateOwnerCalendarEvent({
    ownerId: owner,
    eventId: id(50),
    version: "v1",
    title: "Updated",
  });
  assert.equal(f.tables.calendar_events[0].title, "Updated");
  assert.notEqual(f.tables.calendar_events[0].metadata.version, "v1");
  await assert.rejects(
    manage.deleteOwnerCalendarEvent({
      ownerId: owner,
      eventId: id(50),
      version: "v1",
    }),
    /CALENDAR_CONFLICT/,
  );
  await manage.deleteOwnerCalendarEvent({
    ownerId: owner,
    eventId: id(50),
    version: f.tables.calendar_events[0].metadata.version,
  });
  assert.equal(f.tables.calendar_events.length, 0);
});
test("timeline links canonical appointment/task/note/enrollment records, stable IDs, pagination and tenant isolation", async () => {
  const f = setup();
  f.tables.calendar_events.push({
    id: id(50),
    owner_id: owner,
    contact_id: id(2),
    title: "Future showing",
    starts_at: "2099-10-23T14:00Z",
    created_at: iso,
    metadata: { appointmentType: "showing" },
  });
  f.tables.contact_tasks.push({
    id: id(60),
    owner_id: owner,
    contact_id: id(2),
    title: "Follow-up",
    created_at: iso,
    due_at: end,
    completed: false,
  });
  f.tables.contact_notes.push({
    id: id(70),
    owner_id: owner,
    contact_id: id(2),
    title: "Real note",
    body: "Actual recorded context",
    created_at: iso,
  });
  f.tables.audit_logs.push({
    id: id(80),
    owner_id: "foreign",
    entity_type: "contact",
    entity_id: id(2),
    action: "CONTACT_UPDATED",
    created_at: iso,
    metadata: { fields: ["Secret"] },
  });
  const timeline = f.load("lib/activity/read-model");
  const read = await timeline.readContactActivity(owner, id(2), null);
  assert.equal(read.items.length, 3);
  assert(!JSON.stringify(read).includes("Secret"));
  assert.equal(
    read.items.find((i) => i.type === "appointment").suggestion,
    undefined,
  );
  assert.equal(new Set(read.items.map((i) => i.id)).size, read.items.length);
  await assert.rejects(
    timeline.readContactActivity("foreign", id(2), null),
    /NOT_FOUND/,
  );
  const m = f.load("lib/activity/model");
  const page = m.timelinePage(
    Array.from({ length: 30 }, (_, i) => ({
      id: String(i).padStart(3, "0"),
      at: iso,
      title: "Record",
    })),
    null,
  );
  assert.equal(page.items.length, 25);
  const next = m.timelinePage(
    Array.from({ length: 30 }, (_, i) => ({
      id: String(i).padStart(3, "0"),
      at: iso,
      title: "Record",
    })),
    page.nextCursor,
  );
  assert.equal(next.items.length, 5);
  assert(!next.items.some((i) => page.items.some((p) => p.id === i.id)));
});
test("follow-up suggestions require explicit actual completed/missed status; priorities use actual due times and owned contacts", async () => {
  const f = setup(),
    m = f.load("lib/activity/model");
  assert.equal(
    m.appointmentSuggestion({ appointmentType: "showing" }),
    undefined,
  );
  assert.equal(
    m.appointmentSuggestion({ appointmentType: "showing", status: "completed" })
      .action,
    "task",
  );
  assert.equal(
    m.appointmentSuggestion({ status: "missed" }).action,
    "calendar",
  );
  f.tables.contact_tasks.push(
    {
      id: id(60),
      owner_id: owner,
      contact_id: id(2),
      title: "Overdue",
      due_at: "2026-10-20T14:00Z",
      completed: false,
    },
    {
      id: id(61),
      owner_id: owner,
      contact_id: id(2),
      title: "Done",
      due_at: iso,
      completed: true,
    },
    {
      id: id(62),
      owner_id: "foreign",
      contact_id: id(2),
      title: "Secret",
      due_at: iso,
      completed: false,
    },
  );
  const p = await f
    .load("lib/activity/priorities")
    .readPriorities(owner, "America/New_York", new Date(iso));
  assert.equal(p.items.length, 1);
  assert.equal(p.items[0].status, "Overdue task");
});
test("calendar and contact API errors are safe and cross-account reads fail closed", async () => {
  const f = setup();
  f.actor("foreign");
  const route = f.load("app/api/contacts/[id]/timeline/route");
  const res = await route.GET(
    new Request("http://localhost/api/contacts/" + id(2) + "/timeline"),
    { params: Promise.resolve({ id: id(2) }) },
  );
  assert.equal(res.status, 404);
  f.actor(owner);
  f.fail("calendar_events");
  const calendar = f.load("app/api/calendar/events/route");
  const failure = await calendar.GET(
    new Request(
      "http://localhost/api/calendar/events?from=" + iso + "&to=" + end,
    ),
  );
  assert.equal(failure.status, 503);
  assert(
    !JSON.stringify(await failure.json()).includes("private database trace"),
  );
  f.actor(null);
  const unauth = await route.GET(new Request("http://localhost/test"), {
    params: Promise.resolve({ id: id(2) }),
  });
  assert.equal(unauth.status, 401);
});
test("token encryption authenticates ciphertext; iCalendar escapes control text and exports only private Busy time", () => {
  const f = fixture();
  const previous = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
    "base64",
  );
  try {
    const crypto = f.load("lib/calendar/token-crypto"),
      value = crypto.encryptCalendarToken("synthetic-token-only");
    assert(!value.includes("synthetic-token-only"));
    assert.equal(crypto.decryptCalendarToken(value), "synthetic-token-only");
    const parts = value.split(".");
    parts[2] = Buffer.alloc(16, 1).toString("base64url");
    assert.throws(() => crypto.decryptCalendarToken(parts.join(".")));
    const ical = f.load("lib/calendar/ical");
    assert.equal(
      ical.escapeIcal("A\r\nATTENDEE:x,y;z"),
      "A\\nATTENDEE:x\\,y\\;z",
    );
    const output = ical.calendarIcal([
      {
        id: id(50),
        title: "Secret customer name",
        source: "crm",
        starts_at: iso,
        ends_at: end,
        allDay: true,
        startDate: "2026-10-23",
        endDate: "2026-10-24",
      },
    ]);
    assert(output.includes("DTSTART;VALUE=DATE:20261023"));
    assert(output.includes("DTEND;VALUE=DATE:20261024"));
    assert(output.includes("SUMMARY:Busy"));
    assert(!output.includes("Secret"));
  } finally {
    if (previous === undefined)
      delete process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
    else process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = previous;
  }
});
test("Google reads every page, preserves all-day dates, masks private details, and enforces ETag conflicts", async () => {
  const f = fixture(),
    google = f.load("lib/calendar/google");
  const original = global.fetch;
  const connection = {
    id: id(90),
    owner_id: owner,
    access_token: "synthetic-only",
    expires_at: "2099-01-01T00:00Z",
    calendar_id: "primary",
  };
  let requests = [];
  global.fetch = async (url, init) => {
    requests.push({ url: String(url), init });
    if (init.method === "PATCH") return new Response("{}", { status: 412 });
    const second = String(url).includes("pageToken=next");
    return Response.json(
      second
        ? {
            timeZone: "America/New_York",
            items: [
              {
                id: "b",
                etag: "v2",
                visibility: "private",
                summary: "Secret",
                description: "Secret note",
                start: { dateTime: iso },
                end: { dateTime: end },
              },
            ],
          }
        : {
            timeZone: "America/New_York",
            nextPageToken: "next",
            items: [
              {
                id: "a",
                etag: "v1",
                summary: "All day",
                start: { date: "2026-10-23" },
                end: { date: "2026-10-24" },
              },
            ],
          },
    );
  };
  try {
    const events = await google.listGoogleCalendarEvents({
      connection,
      timeMin: new Date(iso),
      timeMax: new Date(end),
      accessRole: "owner",
    });
    assert.equal(events.length, 2);
    assert.equal(events[0].allDay, true);
    assert.equal(events[0].startDate, "2026-10-23");
    assert.equal(events[0].starts_at, "2026-10-23T04:00:00.000Z");
    assert.equal(events[1].title, "Busy");
    assert.equal(events[1].description, undefined);
    await assert.rejects(
      google.updateGoogleCalendarEvent({
        connection,
        eventId: "b",
        etag: "v2",
        title: "Updated",
        start: new Date(iso),
        end: new Date(end),
        timeZone: "UTC",
      }),
      /CALENDAR_CONFLICT/,
    );
    assert.equal(requests.at(-1).init.headers["If-Match"], "v2");
    assert(requests.at(-1).url.includes("sendUpdates=none"));
  } finally {
    global.fetch = original;
  }
});
test("sharing and public booking fail closed while unconfigured; no provider or database mutation occurs", async () => {
  const f = fixture();
  const old = process.env.CALENDAR_LINKS_ENABLED;
  delete process.env.CALENDAR_LINKS_ENABLED;
  try {
    const route = f.load("app/api/calendar/links/route"),
      res = await route.POST(
        new Request("http://localhost/api/calendar/links", {
          method: "POST",
          body: "{}",
        }),
      );
    assert.equal(res.status, 503);
    assert(
      !f.calls.some((c) => ["insert", "update", "delete"].includes(c.mode)),
    );
    const book = f.load("app/api/calendar/book/[token]/route");
    assert.equal(
      (
        await book.GET(new Request("http://localhost/book"), {
          params: Promise.resolve({ token: "x".repeat(43) }),
        })
      ).status,
      404,
    );
  } finally {
    if (old !== undefined) process.env.CALENDAR_LINKS_ENABLED = old;
  }
});
test("rotated Google tokens are reused across sequential reads; invalid grant preserves authorization record", async () => {
  const f = fixture(),
    g = f.load("lib/calendar/google");
  const original = global.fetch,
    oldKey = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString(
    "base64",
  );
  const connection = {
    id: id(90),
    owner_id: owner,
    access_token: "expired-synthetic",
    refresh_token: "refresh-synthetic",
    expires_at: "2020-01-01T00:00Z",
  };
  f.tables.calendar_connections.push(structuredClone(connection));
  let count = 0;
  global.fetch = async () => {
    count++;
    return Response.json({
      access_token: "fresh-synthetic",
      refresh_token: "rotated-synthetic",
      expires_in: 3600,
    });
  };
  try {
    assert.equal(
      await g.getValidGoogleAccessToken(connection),
      "fresh-synthetic",
    );
    assert.equal(
      await g.getValidGoogleAccessToken(connection),
      "fresh-synthetic",
    );
    assert.equal(count, 1);
    assert(connection.refresh_token.startsWith("enc1."));
    assert.equal(f.tables.calendar_connections.length, 1);
    const expired = { ...connection, expires_at: "2020-01-01T00:00Z" };
    global.fetch = async () =>
      Response.json({ error: "invalid_grant" }, { status: 400 });
    await assert.rejects(
      g.getValidGoogleAccessToken(expired),
      /GOOGLE_RECONNECT_REQUIRED/,
    );
    assert.equal(f.tables.calendar_connections.length, 1);
    assert(!f.calls.some((c) => c.mode === "delete"));
  } finally {
    global.fetch = original;
    if (oldKey === undefined) delete process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
    else process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = oldKey;
  }
});
test("all-day recurrence remains midnight-to-midnight through DST; invalid all-day dates are rejected", async () => {
  const f = setup(),
    schema = f.load("lib/calendar/event-schema").CalendarEventSchema;
  const p = {
    title: "Daily all day",
    startsAt: "2026-03-07T05:00:00.000Z",
    endsAt: "2026-03-08T05:00:00.000Z",
    allDay: true,
    startDate: "2026-03-07",
    endDate: "2026-03-08",
    timeZone: "America/New_York",
    recurrence: "daily",
  };
  assert(schema.safeParse(p).success);
  assert(!schema.safeParse({ ...p, endDate: "2026-03-09" }).success);
  await f
    .load("lib/calendar/create-event")
    .createOwnerCalendarEvent({ ownerId: owner, ...p });
  const event = f.tables.calendar_events.find(
    (r) => r.metadata.startDate === "2026-03-08",
  );
  assert.equal(event.ends_at, "2026-03-09T04:00:00.000Z");
  assert.equal(event.metadata.endDate, "2026-03-09");
});
test("preference writes carry authenticated owner and expected version; stale saves do not silently succeed", async () => {
  const f = fixture();
  let args;
  f.stubs["@/lib/supabaseAdmin"].supabaseAdmin.rpc = async (name, p) => {
    args = { name, ...p };
    return p.p_expected === id(10)
      ? { data: id(11), error: null }
      : { data: null, error: { message: "stale preferences" } };
  };
  const route = f.load("app/api/calendar/preferences/route");
  const input = {
    preferences: { view: "week", timezone: "America/New_York" },
    version: id(10),
  };
  const req = () =>
    new Request("http://localhost/api/calendar/preferences", {
      method: "PUT",
      body: JSON.stringify(input),
    });
  assert.equal((await route.PUT(req())).status, 200);
  assert.equal(args.p_owner, owner);
  assert.equal(args.p_expected, id(10));
  f.actor("other-owner");
  input.version = null;
  assert.equal((await route.PUT(req())).status, 409);
  assert.equal(args.p_owner, "other-owner");
});
test("booking uses real busy intervals and pending holds, supports only configured working hours and honors notice", async () => {
  const f = setup();
  f.tables.calendar_events.push({
    id: id(50),
    owner_id: owner,
    title: "Busy",
    starts_at: "2026-10-26T13:00:00.000Z",
    ends_at: "2026-10-26T14:00:00.000Z",
    provider: "local",
    metadata: {},
    created_at: iso,
  });
  f.tables.calendar_booking_requests.push({
    id: id(60),
    owner_id: owner,
    status: "pending",
    starts_at: "2026-10-26T14:00:00.000Z",
    ends_at: "2026-10-26T15:00:00.000Z",
  });
  const book = f.load("lib/calendar/booking");
  const result = await book.bookingSlots(
    {
      id: id(70),
      owner_id: owner,
      kind: "booking",
      config: {
        timezone: "America/New_York",
        duration: 60,
        workStart: "09:00",
        workEnd: "12:00",
        noticeMinutes: 60,
      },
      active: true,
    },
    "2026-10-26",
    new Date("2026-10-23T12:00Z"),
  );
  assert.equal(result.slots.length, 1);
  assert.equal(result.slots[0].start, "2026-10-26T15:00:00.000Z");
  assert.equal(result.slots[0].end, "2026-10-26T16:00:00.000Z");
});
test("failed provider deletion preserves the canonical local appointment", async () => {
  const f = setup();
  f.tables.calendar_connections.push({
    id: id(90),
    owner_id: owner,
    provider: "google",
    access_token: "synthetic-only",
    expires_at: "2099-01-01T00:00Z",
    calendar_id: "primary",
  });
  f.tables.calendar_events.push({
    id: id(50),
    owner_id: owner,
    provider: "google",
    external_event_id: "external-fixture",
    title: "Keep me",
    starts_at: iso,
    ends_at: end,
    created_at: iso,
    metadata: { version: "v1" },
  });
  const original = global.fetch;
  global.fetch = async () => new Response("{}", { status: 503 });
  try {
    await assert.rejects(
      f.load("lib/calendar/manage-event").deleteOwnerCalendarEvent({
        ownerId: owner,
        eventId: id(50),
        version: "v1",
        etag: "provider-v1",
      }),
    );
    assert.equal(f.tables.calendar_events.length, 1);
    assert(
      !f.calls.some(
        (c) => c.table === "calendar_events" && c.mode === "delete",
      ),
    );
  } finally {
    global.fetch = original;
  }
});
test("contact timeline and Calendar share updated canonical events; task mirrors are not duplicated", async () => {
  const f = setup();
  f.tables.calendar_events.push(
    {
      id: id(50),
      owner_id: owner,
      contact_id: id(2),
      title: "Initial",
      starts_at: iso,
      ends_at: end,
      created_at: iso,
      provider: "local",
      metadata: { version: "v1" },
    },
    {
      id: id(51),
      owner_id: owner,
      contact_id: id(2),
      title: "Mirrored task",
      starts_at: iso,
      ends_at: end,
      created_at: iso,
      external_event_id: "task-external",
      provider: "local",
      metadata: {},
    },
  );
  f.tables.contact_tasks.push({
    id: id(60),
    owner_id: owner,
    contact_id: id(2),
    title: "Canonical task",
    due_at: iso,
    completed: false,
    created_at: iso,
    calendar_event_id: "task-external",
  });
  await f.load("lib/calendar/manage-event").updateOwnerCalendarEvent({
    ownerId: owner,
    eventId: id(50),
    version: "v1",
    title: "Updated showing",
    startsAt: "2026-10-23T16:00:00.000Z",
    endsAt: "2026-10-23T17:00:00.000Z",
    appointmentType: "showing",
    appointmentStatus: "completed",
  });
  const timeline = await f
    .load("lib/activity/read-model")
    .readContactActivity(owner, id(2), null);
  assert.equal(timeline.items.length, 2);
  const a = timeline.items.find((i) => i.id === "appointment:" + id(50));
  assert.equal(a.title, "Updated showing");
  assert.equal(a.scheduledAt, "2026-10-23T16:00:00.000Z");
  assert.equal(a.suggestion.action, "task");
  const calendar = await f
    .load("lib/calendar/read-model")
    .readCalendar(owner, "2026-10-23T00:00Z", "2026-10-24T00:00Z");
  assert.equal(calendar.agenda.length, 2);
  assert.equal(calendar.agenda.find((i) => i.id === id(50)).title, a.title);
});
test("malformed calendar requests and impossible month ranges return safe validation errors", async () => {
  const f = fixture(),
    route = f.load("app/api/calendar/events/route");
  const bad = await route.POST(
    new Request("http://localhost/api/calendar/events", {
      method: "POST",
      body: "{broken",
    }),
  );
  assert.equal(bad.status, 400);
  assert(!JSON.stringify(await bad.json()).includes("SyntaxError"));
  const month = await route.GET(
    new Request("http://localhost/api/calendar/events?month=2026-99"),
  );
  assert.equal(month.status, 400);
});
test("campaign timeline uses owned enrollment and real executed steps; completion suggestion never equates execution with delivery", async () => {
  const f = fixture();
  f.seed();
  f.tables.campaign_step_runs[0].status = "sent";
  f.tables.campaign_step_runs[0].executed_at = iso;
  f.tables.campaign_recipients.push({
    id: id(88),
    owner_id: "foreign",
    contact_id: id(2),
    campaign_id: id(1),
    created_at: iso,
    delivery_status: "Secret",
  });
  const model = f.load("lib/activity/read-model");
  const read = await model.readContactActivity(owner, id(2), null);
  assert.equal(read.items.length, 2);
  assert.equal(
    read.items.find((i) => i.type === "campaign").status,
    "not_sent",
  );
  const sequence = read.items.find((i) => i.type === "sequence");
  assert.equal(sequence.suggestion.action, "campaign");
  assert(sequence.suggestion.text.includes("does not prove delivery"));
  assert(!JSON.stringify(read).includes("Secret"));
  f.tables.campaign_step_runs[0].status = "scheduled";
  f.tables.campaign_step_runs[0].executed_at = null;
  const pending = await model.readContactActivity(owner, id(2), null);
  assert.equal(
    pending.items.find((i) => i.type === "sequence").suggestion,
    undefined,
  );
  assert.equal(f.payloads.length, 0);
});
test("existing campaign callback synchronization is idempotent and does not claim success on local save failure", async () => {
  const f = fixture();
  f.seed();
  const created = [];
  f.stubs["./google"] = {
    getGoogleConnection: async () => ({
      id: id(90),
      owner_id: owner,
      calendar_id: "primary",
    }),
    createGoogleCalendarEvent: async (args) => {
      created.push(args);
      return { eventId: args.eventId, etag: "v1" };
    },
    getGoogleEvent: async () => ({ id: "existing", status: "confirmed" }),
  };
  const sync = f.load("lib/calendar/sync").syncCallbackStepToCalendar;
  const opts = {
    ownerId: owner,
    contact: f.contact,
    campaignId: id(1),
    stepRunId: id(5),
    stepType: "callback",
    scheduledAt: iso,
  };
  assert.equal((await sync(opts)).synced, true);
  assert.equal((await sync(opts)).synced, true);
  assert.equal(created.length, 1);
  assert.equal(f.tables.calendar_events.length, 1);
  assert.equal(f.tables.calendar_events[0].step_run_id, id(5));
  f.tables.calendar_events = [];
  f.fail("calendar_events");
  assert.equal((await sync(opts)).synced, false);
  assert.equal(created.length, 1);
  f.fail(null);
  f.tables.calendar_events = [];
  assert.equal((await sync(opts)).synced, true);
  assert.equal(created[0].eventId, created[1].eventId);
  const db = f.stubs["@/lib/supabaseAdmin"].supabaseAdmin;
  const originalFrom = db.from.bind(db);
  db.from = (table) => {
    const q = originalFrom(table);
    if (table === "calendar_events")
      q.upsert = () =>
        Promise.resolve({
          data: null,
          error: { message: "private write failure" },
        });
    return q;
  };
  f.tables.calendar_events = [];
  const failed = await sync(opts);
  assert.equal(failed.synced, false);
  assert.equal(failed.reason, "external_event_saved_local_copy_needs_review");
  assert.equal(created.at(-1).eventId, created[0].eventId);
  db.from = originalFrom;
  assert.equal(f.payloads.length, 0);
});
test("free/busy-only calendars block conflicts without exposing event details or write controls", async () => {
  const f = fixture(),
    g = f.load("lib/calendar/google");
  const original = global.fetch;
  global.fetch = async (url, init) => {
    assert(String(url).endsWith("/freeBusy"));
    assert.equal(init.method, "POST");
    return Response.json({
      calendars: { "shared-calendar": { busy: [{ start: iso, end }] } },
    });
  };
  try {
    const result = await g.listGoogleBusyIntervals({
      connection: {
        id: id(90),
        owner_id: owner,
        access_token: "synthetic-only",
        expires_at: "2099-01-01T00:00Z",
      },
      calendarId: "shared-calendar",
      timeMin: new Date(iso),
      timeMax: new Date(end),
    });
    assert.equal(result[0].title, "Busy");
    assert.equal(result[0].editable, false);
    assert.equal(result[0].private, true);
    assert.equal(result[0].description, undefined);
    assert.equal(
      f.load("lib/calendar/conflicts").conflictsFor(result, iso, end).length,
      1,
    );
  } finally {
    global.fetch = original;
  }
});
test("booking availability fails closed if provider authorization records cannot be read", async () => {
  const f = setup();
  f.fail("calendar_connections");
  await assert.rejects(
    f
      .load("lib/calendar/booking")
      .bookingSlots(
        {
          id: id(70),
          owner_id: owner,
          kind: "booking",
          config: {
            timezone: "America/New_York",
            duration: 60,
            workStart: "09:00",
            workEnd: "12:00",
            noticeMinutes: 60,
          },
          active: true,
        },
        "2026-10-26",
        new Date("2026-10-23T12:00Z"),
      ),
    /EXTERNAL_UNVERIFIED/,
  );
  assert.equal(f.payloads.length, 0);
});
