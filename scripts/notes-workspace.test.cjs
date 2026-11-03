/* Isolated route/service tests. No credentials or outbound provider calls. */
const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { fixture, id, owner } = require("./campaign-audit/harness.cjs");
const req = (body) =>
  new Request("http://localhost/api/notes/workspace", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const saveBody = () => ({
  clientKey: id(50),
  expectedRevision: 0,
  title: "Consultation",
  body: "Client requested a garden.",
  kind: "note",
  metadata: { contactIds: [id(2)] },
});
function setup() {
  const f = fixture();
  f.tables.contacts.push(structuredClone(f.contact));
  f.tables.contact_notes.push({
    id: id(40),
    owner_id: owner,
    title: "Consultation",
    body: "Client requested a garden.",
    kind: "note",
    revision: 1,
    client_key: id(50),
    metadata: { contactIds: [id(2)] },
  });
  return f;
}
test("combined category, tag, contact, full-text and property filters use stable associations", () => {
  const f = setup(),
    m = f.load("lib/notes/workspace"),
    n = {
      ...f.tables.contact_notes[0],
      created_at: "2026-10-20T00:00Z",
      metadata: m.MetadataSchema.parse({
        category: "Clients",
        tags: ["buyer"],
        contactIds: [id(2)],
        propertyContactIds: [id(2)],
      }),
    };
  const rows = m.filterNotes(
    [n],
    "jordan garden",
    "Clients",
    "buyer",
    id(2),
    "recent",
    [f.contact],
  );
  assert.equal(rows.length, 1);
  assert.equal(
    m.filterNotes([n], "missing", "Clients", "buyer", id(2), "recent", [
      f.contact,
    ]).length,
    0,
  );
  assert.equal(
    m.filterNotes([n], "example lane", "Properties", "", "", "title", [
      f.contact,
    ]).length,
    1,
  );
  assert.equal(
    m.filterNotes([n], "", "Pinned", "", "", "recent", [f.contact]).length,
    0,
  );
});
test("metadata retains legacy category and primary contact without inventing records", () => {
  const f = fixture(),
    m = f.load("lib/notes/workspace");
  assert.equal(m.metadataOf({ kind: "goal" }).category, "Goals");
  assert.deepEqual(
    m.relatedContactIds({
      kind: "note",
      contact_id: id(2),
      metadata: { contactIds: [id(2), id(3)] },
    }),
    [id(2), id(3)],
  );
  assert.throws(() => m.MetadataSchema.parse({ contactIds: ["sample-name"] }));
});
test("workspace reads are paginated and scoped to owner including contacts", async () => {
  const f = setup();
  f.tables.contact_notes.push({
    ...f.tables.contact_notes[0],
    id: id(41),
    owner_id: "other",
  });
  const r = await f
    .load("app/api/notes/workspace/route")
    .GET(new Request("http://localhost"));
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.notes.length, 1);
  assert.equal(data.contacts.length, 1);
  assert.ok(
    f.calls
      .filter((c) => c.filter === "owner_id")
      .every((c) => c.value === owner),
  );
});
test("workspace rejects foreign contact and property link before RPC", async () => {
  const f = setup();
  let called = false;
  f.stubs["@/lib/supabaseAdmin"].supabaseAdmin.rpc = () => {
    called = true;
  };
  const handler = f.load("app/api/notes/workspace/route").POST;
  assert.equal(
    (await handler(req({ ...saveBody(), metadata: { contactIds: [id(99)] } })))
      .status,
    404,
  );
  assert.equal(
    (
      await handler(
        req({ ...saveBody(), metadata: { propertyContactIds: [id(99)] } }),
      )
    ).status,
    404,
  );
  assert.equal(called, false);
});
test("workspace CAS passes authenticated owner and maps stale writes to safe conflict", async () => {
  const f = setup();
  let args;
  f.stubs["@/lib/supabaseAdmin"].supabaseAdmin.rpc = async (_name, a) => {
    args = a;
    return { error: { message: "NOTE_CONFLICT sensitive internal" } };
  };
  const r = await f.load("app/api/notes/workspace/route").POST(req(saveBody()));
  assert.equal(r.status, 409);
  assert.equal(args.p_owner, owner);
  assert.equal(args.p_expected, 0);
  assert.equal((await r.text()).includes("sensitive"), false);
});
test("API failures do not leak SQL errors, and malformed saves fail before database writes", async () => {
  const f = setup();
  f.stubs["@/lib/supabaseAdmin"].supabaseAdmin.rpc = async () => ({
    error: { message: "secret connection URL" },
  });
  const handler = f.load("app/api/notes/workspace/route").POST;
  const r = await handler(req(saveBody()));
  assert.equal(r.status, 503);
  assert.ok(!(await r.text()).includes("secret"));
  assert.equal((await handler(req({ title: "bad" }))).status, 400);
});
test("unauthenticated workspace and AI requests fail closed", async () => {
  const f = fixture();
  f.actor(null);
  assert.equal(
    (
      await f
        .load("app/api/notes/workspace/route")
        .GET(new Request("http://localhost"))
    ).status,
    401,
  );
  assert.equal(
    (await f.load("app/api/notes/assist/route").POST(req({}))).status,
    401,
  );
});
test("AI structured output requires exact transcript quotes and never accepts malformed or empty output", () => {
  const f = fixture(),
    { validateSummary } = f.load("lib/notes/ai");
  const s = {
    overview: "Client discussed a garden.",
    discussion: [{ text: "Garden requested", quote: "requested a garden" }],
    preferences: [],
    decisions: [],
    commitments: [],
    questions: [],
    suggestions: [],
    draft: "",
  };
  assert.equal(
    validateSummary(s, "Client requested a garden.").discussion.length,
    1,
  );
  assert.throws(() => validateSummary(s, "No matching transcript."));
  assert.throws(() =>
    validateSummary('```json\n{"recommendation":"fake"}\n```', "input"),
  );
  assert.throws(() => validateSummary("", "input"));
});
test("AI prompt uses no fallback fabricated summaries and safely handles timeout or invalid JSON", async () => {
  const f = fixture(),
    ai = f.load("lib/notes/ai"),
    old = process.env.ANTHROPIC_API_KEY,
    fetch = global.fetch;
  try {
    delete process.env.ANTHROPIC_API_KEY;
    await assert.rejects(
      () => ai.assistNote("Recorded facts", "Summarize & suggest actions"),
      /UNCONFIGURED/,
    );
    process.env.ANTHROPIC_API_KEY = "synthetic-test-key";
    global.fetch = async () => {
      throw Error("Timeout");
    };
    await assert.rejects(() =>
      ai.assistNote("Recorded facts", "Summarize & suggest actions"),
    );
    global.fetch = async () =>
      new Response(
        JSON.stringify({ content: [{ type: "text", text: "{}" }] }),
        { status: 200 },
      );
    await assert.rejects(() =>
      ai.assistNote("Recorded facts", "Summarize & suggest actions"),
    );
  } finally {
    global.fetch = fetch;
    if (old === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = old;
  }
});
test("task creation requires explicit approval, owned note and owned contact", async () => {
  const f = setup(),
    handler = f.load("app/api/notes/[id]/tasks/route").POST,
    context = { params: Promise.resolve({ id: id(40) }) };
  const body = {
    actionKey: id(60),
    title: "Review garden criteria",
    contactId: id(2),
    dueAt: null,
  };
  assert.equal((await handler(req(body), context)).status, 400);
  assert.equal(
    (
      await handler(
        req({ ...body, approved: true, contactId: id(99) }),
        context,
      )
    ).status,
    404,
  );
  f.actor("other");
  assert.equal(
    (await handler(req({ ...body, approved: true }), context)).status,
    404,
  );
});
test("task creation carries stable action key, actual contact and source note to atomic function; no reminder unless requested", async () => {
  const f = setup();
  let args,
    syncs = 0;
  f.stubs["@/lib/supabaseAdmin"].supabaseAdmin.rpc = async (name, a) => {
    args = a;
    return {
      data: { id: id(70), due_at: null, contact_id: id(2) },
      error: null,
    };
  };
  f.stubs["@/lib/calendar/task-sync"] = {
    syncTaskReminderToCalendar: async () => {
      syncs++;
      return { synced: true };
    },
  };
  const r = await f.load("app/api/notes/[id]/tasks/route").POST(
    req({
      actionKey: id(60),
      title: "Review garden criteria",
      contactId: id(2),
      dueAt: null,
      approved: true,
    }),
    { params: Promise.resolve({ id: id(40) }) },
  );
  assert.equal(r.status, 200);
  assert.equal(args.p_action, id(60));
  assert.equal(args.p_note, id(40));
  assert.equal(args.p_owner, owner);
  assert.equal(syncs, 0);
});
test("audio rejects missing consent and empty audio without sending to provider", async () => {
  const f = fixture(),
    old = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "synthetic-key";
  try {
    const form = new FormData();
    form.set(
      "audio",
      new Blob(["synthetic"], { type: "audio/wav" }),
      "test.wav",
    );
    let r = await f
      .load("app/api/notes/transcribe/route")
      .POST(new Request("http://localhost", { method: "POST", body: form }));
    assert.equal(r.status, 400);
    const empty = new FormData();
    empty.set("consent", "confirmed");
    empty.set("audio", new Blob([], { type: "audio/wav" }), "empty.wav");
    r = await f
      .load("app/api/notes/transcribe/route")
      .POST(new Request("http://localhost", { method: "POST", body: empty }));
    assert.equal(r.status, 400);
  } finally {
    if (old === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = old;
  }
});
test("audio transcription returns editable synthetic text and uncertainty without persisting audio", async () => {
  const f = fixture(),
    old = process.env.OPENAI_API_KEY,
    fetch = global.fetch;
  process.env.OPENAI_API_KEY = "synthetic-key";
  try {
    global.fetch = async () =>
      new Response(
        JSON.stringify({
          text: "Garden preferences unclear.",
          segments: [
            {
              start: 0,
              end: 1,
              text: "Garden preferences unclear.",
              avg_logprob: -2,
              no_speech_prob: 0.1,
            },
          ],
        }),
      );
    const form = new FormData();
    form.set("consent", "confirmed");
    form.set(
      "audio",
      new Blob(["synthetic-audio-only"], { type: "audio/wav" }),
      "test.wav",
    );
    const r = await f
        .load("app/api/notes/transcribe/route")
        .POST(new Request("http://localhost", { method: "POST", body: form })),
      data = await r.json();
    assert.equal(r.status, 200);
    assert.equal(data.segments[0].uncertain, true);
    assert.equal(data.transcript, "Garden preferences unclear.");
    assert.equal(f.calls.length, 0);
  } finally {
    global.fetch = fetch;
    if (old === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = old;
  }
});
test("planner day/week/month ranges have exclusive ends and never duplicate canonical task records", () => {
  const m = fixture().load("lib/notes/workspace");
  for (const view of ["day", "week", "month"]) {
    const r = m.plannerRange("2026-10-23", view);
    assert.ok(Date.parse(r.end) > Date.parse(r.start));
  }
  assert.equal(
    new Date(m.plannerRange("2026-10-23", "month").start).getDate(),
    1,
  );
});

function basicSetup() {
  const f = setup(),
    db = f.stubs["@/lib/supabaseAdmin"].supabaseAdmin;
  const original = db.from.bind(db);
  db.from = (table) => {
    const q = original(table),
      select = q.select.bind(q),
      then = q.then.bind(q);
    let columns = "";
    q.select = (c, ...args) => {
      columns = c;
      return select(c, ...args);
    };
    q.then = (resolve, reject) =>
      table === "contact_notes" &&
      ["metadata", "revision", "client_key"].includes(columns)
        ? Promise.resolve({
            data: null,
            error: { code: "42703", message: "private schema column detail" },
          }).then(resolve, reject)
        : then(resolve, reject);
    return q;
  };
  for (const n of f.tables.contact_notes) {
    delete n.metadata;
    delete n.revision;
    delete n.client_key;
    n.updated_at = "2026-10-22T12:00:00.000Z";
    n.contact_id = id(2);
  }
  return f;
}
test("unmigrated schema loads actual owned notes without requiring new columns", async () => {
  const f = basicSetup();
  f.tables.contact_notes.push({
    ...f.tables.contact_notes[0],
    id: id(99),
    owner_id: "other",
  });
  const r = await f
    .load("app/api/notes/workspace/route")
    .GET(new Request("http://localhost"));
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.equal(d.mode, "basic");
  assert.equal(d.notes.length, 1);
  assert.equal(d.notes[0].client_key, id(40));
  assert.deepEqual(d.notes[0].metadata.contactIds, [id(2)]);
});
test("basic saves use timestamp CAS, reject stale writes, and preserve subscriber isolation", async () => {
  const f = basicSetup(),
    handler = f.load("app/api/notes/workspace/route").POST;
  const body = {
    ...saveBody(),
    id: id(40),
    clientKey: id(40),
    expectedUpdatedAt: "2026-10-22T12:00:00.000Z",
    body: "New actual note content.",
  };
  const first = await handler(req(body));
  assert.equal(first.status, 200);
  assert.equal((await first.json()).note.body, body.body);
  assert.equal(
    (await handler(req({ ...body, body: "Stale content." }))).status,
    409,
  );
  f.actor("other");
  assert.equal((await handler(req(body))).status, 404);
  assert.equal(f.tables.contact_notes[0].body, "New actual note content.");
});
test("basic creation retries are idempotent; unsupported metadata is never silently discarded", async () => {
  const f = basicSetup(),
    handler = f.load("app/api/notes/workspace/route").POST;
  let r = await handler(req(saveBody()));
  assert.equal(r.status, 200);
  r = await handler(req(saveBody()));
  assert.equal(r.status, 200);
  assert.equal(f.tables.contact_notes.filter((n) => n.id === id(50)).length, 1);
  r = await handler(
    req({
      ...saveBody(),
      metadata: { contactIds: [id(2)], tags: ["must preserve"] },
    }),
  );
  assert.equal(r.status, 409);
  assert.equal((await r.json()).code, "upgrade_required");
});
test("schema connection errors never trigger basic-mode fallback", async () => {
  const f = setup();
  f.fail("contact_notes");
  const r = await f
    .load("app/api/notes/workspace/route")
    .GET(new Request("http://localhost"));
  assert.equal(r.status, 503);
  assert.equal((await r.text()).includes("private"), false);
});
test("planner reads existing tasks without projecting upgrade-only columns", async () => {
  const f = basicSetup();
  f.tables.contact_tasks.push(
    {
      id: id(70),
      owner_id: owner,
      title: "Existing task",
      contact_id: id(2),
      due_at: null,
      completed: false,
    },
    { id: id(71), owner_id: "other", title: "Private task" },
  );
  const r = await f
    .load("app/api/notes/planner/route")
    .GET(new Request("http://localhost"));
  assert.equal(r.status, 200);
  assert.equal((await r.json()).tasks.length, 1);
});
test("basic property associations use the actual owned contact key and reject independent or foreign links", async () => {
  const f = basicSetup(),
    route = f.load("app/api/notes/workspace/route");
  const body = {
    ...saveBody(),
    metadata: { contactIds: [id(2)], propertyContactIds: [id(2)] },
  };
  const r = await route.POST(req(body));
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).note.metadata.propertyContactIds, [id(2)]);
  const loaded = await route.GET(new Request("http://localhost"));
  assert.deepEqual(
    (await loaded.json()).notes.find((n) => n.id === id(50)).metadata
      .propertyContactIds,
    [id(2)],
  );
  const invalid = await route.POST(
    req({
      ...saveBody(),
      clientKey: id(51),
      metadata: { contactIds: [id(2)], propertyContactIds: [id(99)] },
    }),
  );
  assert.equal(invalid.status, 409);
  assert.equal(
    f.tables.contact_notes.some((n) => n.id === id(51)),
    false,
  );
});
