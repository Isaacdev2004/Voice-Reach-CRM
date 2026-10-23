const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { fixture, id, owner } = require("./campaign-audit/harness.cjs");
function setup() {
  const f = fixture();
  f.tables.task_transactions = [];
  f.tables.contacts.push({ ...f.contact, property_address: "Actual property" });
  f.stubs["@/lib/billing/settings-store"] = {
    loadSavedSettings: async () => ({
      profile: { fullName: "QA", timezone: "America/New_York" },
      team: [],
    }),
  };
  f.stubs["@/lib/calendar/load-preferences"] = {
    loadCalendarPreferences: async () => ({
      timezone: "America/New_York",
      mondayStart: true,
      inAppReminders: false,
    }),
  };
  return f;
}
const req = (path, body, method = "POST") =>
  new Request("http://localhost" + path, {
    method,
    headers: { "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const body = () => ({
  id: id(50),
  title: "Verified task",
  contactId: id(2),
  workspace: { timezone: "America/New_York" },
});
test("workspace requires authentication and reads only owner records", async () => {
  const f = setup();
  f.tables.contact_tasks.push(
    {
      id: id(10),
      owner_id: owner,
      contact_id: id(2),
      title: "Mine",
      due_at: null,
      completed: false,
    },
    {
      id: id(11),
      owner_id: "other",
      contact_id: id(3),
      title: "Foreign secret",
      completed: false,
    },
  );
  const r = f.load("app/api/tasks/workspace/route");
  let response = await r.GET(req("/api/tasks/workspace", null, "GET"));
  assert.equal(response.status, 200);
  const json = await response.json();
  assert.equal(json.data.tasks.length, 1);
  assert.equal(json.data.tasks[0].title, "Mine");
  f.actor(null);
  response = await r.GET(req("/api/tasks/workspace", null, "GET"));
  assert.equal(response.status, 401);
});
test("task associations, dependencies, source notes and assignees reject cross-account data", async () => {
  for (const patch of [
    { contactId: id(88) },
    { sourceNoteId: id(88) },
    { workspace: { propertyContactId: id(88) } },
    { workspace: { assigneeId: "other" } },
    { workspace: { dependencies: [id(88)] } },
    { workspace: { sourceCampaignId: id(88) } },
    { workspace: { sourceEventId: id(88) } },
  ]) {
    const f = setup(),
      r = f.load("app/api/tasks/workspace/route");
    const response = await r.POST(
      req("/api/tasks/workspace", { ...body(), ...patch }),
    );
    assert(response.status >= 400);
    assert.equal(f.tables.contact_tasks.length, 0);
  }
});
test("create/edit/reopen use actual owned row and conflict protection", async () => {
  const f = setup(),
    r = f.load("app/api/tasks/workspace/route");
  let response = await r.POST(req("/api/tasks/workspace", body()));
  assert.equal(response.status, 200);
  const row = f.tables.contact_tasks[0];
  assert.equal(row.owner_id, owner);
  response = await r.POST(
    req("/api/tasks/workspace", {
      ...body(),
      title: "Overwrite without version",
    }),
  );
  assert.equal(response.status, 409);
  response = await r.POST(
    req("/api/tasks/workspace", {
      ...body(),
      expectedUpdatedAt: row.updated_at,
      completed: true,
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(f.tables.contact_tasks[0].completed, true);
  assert(f.tables.contact_tasks[0].completed_at);
  response = await r.POST(
    req("/api/tasks/workspace", {
      ...body(),
      expectedUpdatedAt: f.tables.contact_tasks[0].updated_at,
      completed: false,
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(f.tables.contact_tasks[0].completed_at, null);
  assert(f.calls.some((c) => c.audit?.action === "CONTACT_TASK_CREATED"));
});
test("completion blocks on prerequisites and cycles are rejected", async () => {
  const f = setup();
  f.tables.contact_tasks.push({
    id: id(10),
    owner_id: owner,
    contact_id: id(2),
    title: "Prerequisite",
    completed: false,
    updated_at: "v1",
    workspace: {},
  });
  const r = f.load("app/api/tasks/workspace/route");
  let response = await r.POST(
    req("/api/tasks/workspace", {
      ...body(),
      completed: true,
      workspace: { dependencies: [id(10)] },
    }),
  );
  assert.equal(response.status, 409);
  f.tables.contact_tasks[0].workspace = { dependencies: [id(50)] };
  response = await r.POST(
    req("/api/tasks/workspace", {
      ...body(),
      workspace: { dependencies: [id(10)] },
    }),
  );
  assert.equal(response.status, 400);
});
test("foreign deletion returns 404 and never mutates another tenant", async () => {
  const f = setup();
  f.tables.contact_tasks.push({
    id: id(10),
    owner_id: "other",
    title: "Foreign",
  });
  const r = f.load("app/api/tasks/workspace/route");
  const response = await r.DELETE(
    req("/api/tasks/workspace?id=" + id(10), null, "DELETE"),
  );
  assert.equal(response.status, 404);
  assert.equal(f.tables.contact_tasks.length, 1);
});
test("database errors are sanitized and never replaced with zero records", async () => {
  const f = setup();
  f.fail("contact_tasks");
  const r = f.load("app/api/tasks/workspace/route");
  const response = await r.GET(req("/api/tasks/workspace", null, "GET"));
  assert.equal(response.status, 503);
  const text = await response.text();
  assert(!text.includes("contact_tasks"));
  assert(!text.includes("secret"));
});
test("review approval is required before AI batch/checklist mutation", async () => {
  const f = setup();
  for (const path of ["proposals", "checklists"]) {
    const r = f.load("app/api/tasks/" + path + "/route");
    const response = await r.POST(
      req("/api/tasks/" + path, {
        id: id(60),
        approved: false,
        tasks: [body()],
      }),
    );
    assert.equal(response.status, 400);
    assert.equal(f.tables.contact_tasks.length, 0);
  }
});
test("preferences are owner scoped, validated and restored via existing settings audit", async () => {
  const f = setup(),
    r = f.load("app/api/tasks/preferences/route");
  let response = await r.POST(
    req("/api/tasks/preferences", { view: "board", scope: "high" }),
  );
  assert.equal(response.status, 200);
  assert(f.calls.some((c) => c.audit?.ownerId === owner));
  response = await r.POST(req("/api/tasks/preferences", { view: "invented" }));
  assert.equal(response.status, 400);
});
test("completed task calendar mirrors stay hidden, reminder-only tasks appear once", async () => {
  const f = setup(),
    start = "2026-10-23T14:00:00Z",
    end = "2026-10-23T15:00:00Z";
  f.tables.contact_tasks.push(
    {
      id: id(10),
      owner_id: owner,
      contact_id: id(2),
      title: "Completed",
      completed: true,
      due_at: start,
      calendar_event_id: "mirror",
    },
    {
      id: id(11),
      owner_id: owner,
      contact_id: id(2),
      title: "Reminder only",
      completed: false,
      due_at: null,
      reminder_at: start,
    },
  );
  f.tables.calendar_events.push(
    {
      id: id(20),
      owner_id: owner,
      title: "Old mirror",
      starts_at: start,
      ends_at: end,
      external_event_id: "mirror",
      provider: "local",
      metadata: { taskId: id(10) },
    },
    {
      id: id(21),
      owner_id: "other",
      title: "Foreign",
      starts_at: start,
      ends_at: end,
      provider: "local",
      metadata: {},
    },
  );
  const r = await f
    .load("lib/calendar/read-model")
    .readCalendar(owner, start, end);
  assert.equal(r.agenda.length, 1);
  assert.equal(r.agenda[0].title, "Reminder only");
});
test("stale account requests cannot write preferences into the next subscriber account", async () => {
  const f = setup(),
    r = f.load("app/api/tasks/preferences/route");
  const request = new Request("http://localhost/api/tasks/preferences", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-MyARI-Owner": "old-owner",
    },
    body: JSON.stringify({ view: "board" }),
  });
  const response = await r.POST(request);
  assert.equal(response.status, 404);
  assert(!f.calls.some((c) => c.audit));
});
test("malformed requests and unavailable AI return safe subscriber messages", async () => {
  const f = setup();
  const r = f.load("app/api/tasks/workspace/route");
  let response = await r.POST(
    new Request("http://localhost/api/tasks/workspace", {
      method: "POST",
      body: "{broken",
    }),
  );
  assert.equal(response.status, 400);
  f.stubs["@/lib/tasks/ai"] = {
    proposeTasks: async () => {
      throw Error("UNCONFIGURED");
    },
  };
  response = await f
    .load("app/api/tasks/ai/route")
    .POST(req("/api/tasks/ai", { source: "Call the client" }));
  assert.equal(response.status, 503);
  assert(!(await response.text()).includes("ANTHROPIC"));
});
test("full workspace snapshots are not truncated to 200 tasks or a default page", async () => {
  const f = setup();
  for (let i = 0; i < 1101; i++)
    f.tables.contact_tasks.push({
      id: id(3000 + i),
      owner_id: owner,
      contact_id: id(2),
      title: "Owned " + i,
      due_at: null,
      completed: false,
    });
  f.tables.contact_tasks.push({
    id: id(9999),
    owner_id: "other",
    title: "Foreign",
  });
  const response = await f
    .load("app/api/tasks/workspace/route")
    .GET(req("/api/tasks/workspace", null, "GET"));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.tasks.length, 1101);
});
test("custom templates load all pages and never include a foreign workspace template", async () => {
  const f = setup();
  for (let i = 0; i < 510; i++)
    f.tables.audit_logs.push({
      id: id(5000 + i),
      owner_id: owner,
      created_at: "2026-10-23T00:00Z",
      entity_type: "task_template",
      action: "TASK_TEMPLATE_SAVED",
      metadata: {
        template: {
          id: "custom-" + i,
          name: "Owned " + i,
          kind: "checklist",
          steps: [{ title: "Review", days: 0 }],
        },
      },
    });
  f.tables.audit_logs.push({
    id: id(9000),
    owner_id: "other",
    created_at: "2026-10-23T00:00Z",
    entity_type: "task_template",
    action: "TASK_TEMPLATE_SAVED",
    metadata: {
      template: {
        id: "foreign",
        name: "Foreign",
        kind: "checklist",
        steps: [{ title: "Private", days: 0 }],
      },
    },
  });
  const response = await f
    .load("app/api/tasks/templates/route")
    .GET(req("/api/tasks/templates", null, "GET"));
  assert.equal(response.status, 200);
  const rows = (await response.json()).data.templates;
  assert.equal(rows.length, 518);
  assert(!rows.some((t) => t.id === "foreign"));
});

test("legacy tasks with a null update timestamp remain editable without losing concurrency protection", async () => {
  const f = setup();
  f.tables.contact_tasks.push({
    id: id(50),
    owner_id: owner,
    contact_id: id(2),
    title: "Legacy",
    completed: false,
    due_at: null,
    updated_at: null,
    workspace: {},
  });
  const r = f.load("app/api/tasks/workspace/route");
  let response = await r.POST(
    req("/api/tasks/workspace", {
      ...body(),
      expectedUpdatedAt: null,
      title: "Updated legacy task",
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(f.tables.contact_tasks[0].title, "Updated legacy task");
  assert(f.tables.contact_tasks[0].updated_at);
  response = await r.POST(
    req("/api/tasks/workspace", {
      ...body(),
      expectedUpdatedAt: null,
      title: "Stale update",
    }),
  );
  assert.equal(response.status, 409);
  assert.equal(f.tables.contact_tasks[0].title, "Updated legacy task");
});
