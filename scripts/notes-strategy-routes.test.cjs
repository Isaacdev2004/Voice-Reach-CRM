const { test } = require("node:test"),
  assert = require("node:assert/strict");
const { fixture, id, owner } = require("./campaign-audit/harness.cjs");
const request = (body) =>
  new Request("http://localhost", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
function setup() {
  const f = fixture();
  f.tables.note_tags = [];
  f.tables.note_versions = [];
  f.tables.contacts.push({ ...f.contact });
  f.tables.contact_notes.push({
    id: id(40),
    owner_id: owner,
    client_key: id(50),
    title: "Current",
    body: "Current text",
    kind: "note",
    revision: 2,
    metadata: {},
  });
  return f;
}
test("Notes 2 metadata normalizes tags and combines tag/search filters", () => {
  const f = setup(),
    m = f.load("lib/notes/workspace");
  const meta = m.MetadataSchema.parse({
    tags: [" Buyer ", "buyer", "BUYER", "Follow   up", "Follow up"],
  });
  assert.deepEqual(meta.tags, ["Buyer", "Follow up"]);
  assert.throws(() => m.MetadataSchema.parse({ campaignIds: ["not-a-uuid"] }));
});
test("new association lists and reverse links are owner-scoped", async () => {
  const f = setup();
  f.tables.campaigns.push(
    { id: id(1), owner_id: owner, name: "Owned" },
    { id: id(2), owner_id: "foreign", name: "Private" },
  );
  f.tables.contact_notes[0].metadata = { campaignIds: [id(1)] };
  let r = await f
    .load("app/api/notes/associations/route")
    .GET(new Request("http://localhost"));
  assert.equal(r.status, 200);
  assert.deepEqual(
    (await r.json()).campaigns.map((x) => x.name),
    ["Owned"],
  );
  r = await f
    .load("app/api/notes/linked/route")
    .GET(new Request(`http://localhost?type=campaign&id=${id(2)}`));
  assert.equal(r.status, 404);
  r = await f
    .load("app/api/notes/linked/route")
    .GET(new Request(`http://localhost?type=campaign&id=${id(1)}`));
  assert.equal((await r.json()).notes.length, 1);
});
test("new links reject foreign campaigns and tasks before any RPC", async () => {
  const f = setup(),
    m = f.load("lib/notes/workspace"),
    s = f.load("lib/notes/server");
  f.tables.campaigns.push({ id: id(1), owner_id: "foreign" });
  f.tables.contact_tasks.push({ id: id(2), owner_id: "foreign" });
  assert.equal(
    await s.validateLinks(
      owner,
      m.MetadataSchema.parse({ campaignIds: [id(1)] }),
    ),
    false,
  );
  assert.equal(
    await s.validateLinks(owner, m.MetadataSchema.parse({ taskIds: [id(2)] })),
    false,
  );
});
test("tag mutations require explicit confirmation and derive owner from session", async () => {
  const f = setup();
  let called = false;
  f.stubs["@/lib/supabaseAdmin"].supabaseAdmin.rpc = async (name, p) => {
    called = true;
    assert.equal(name, "manage_note_tag");
    assert.equal(p.p_owner, owner);
    return { data: { id: id(90), name: "Buyer" }, error: null };
  };
  const route = f.load("app/api/notes/tags/route");
  assert.equal(
    (await route.POST(request({ action: "create", name: "Buyer" }))).status,
    400,
  );
  assert.equal(called, false);
  assert.equal(
    (
      await route.POST(
        request({ action: "create", name: "Buyer", confirmed: true }),
      )
    ).status,
    200,
  );
  assert.equal(
    (
      await route.POST(
        request({
          action: "create",
          name: "Buyer",
          confirmed: true,
          owner_id: "foreign",
        }),
      )
    ).status,
    400,
  );
});
test("restore needs confirmation, owned history, valid historical links and current revision", async () => {
  const f = setup();
  f.tables.note_versions.push({
    id: id(60),
    note_id: id(40),
    owner_id: owner,
    revision: 1,
    title: "Original",
    body: "Original body",
    kind: "note",
    metadata: {},
    contact_id: null,
  });
  let called = false;
  f.stubs["@/lib/supabaseAdmin"].supabaseAdmin.rpc = async (name, p) => {
    called = true;
    assert.equal(name, "save_notes_workspace");
    assert.equal(p.p_owner, owner);
    assert.equal(p.p_expected, 2);
    return {
      data: { ...f.tables.contact_notes[0], body: p.p_body, revision: 3 },
      error: null,
    };
  };
  const route = f.load("app/api/notes/[id]/restore/route"),
    ctx = { params: Promise.resolve({ id: id(40) }) };
  assert.equal(
    (await route.POST(request({ versionId: id(60), expectedRevision: 2 }), ctx))
      .status,
    400,
  );
  assert.equal(called, false);
  let r = await route.POST(
    request({
      versionId: id(60),
      expectedRevision: 2,
      confirmation: "RESTORE_NOTE",
    }),
    ctx,
  );
  assert.equal(r.status, 200);
  assert.equal((await r.json()).note.revision, 3);
  f.actor("foreign");
  called = false;
  r = await route.POST(
    request({
      versionId: id(60),
      expectedRevision: 2,
      confirmation: "RESTORE_NOTE",
    }),
    ctx,
  );
  assert.equal(r.status, 404);
  assert.equal(called, false);
});
test("tag reads reject unauthenticated callers and never disclose database errors", async () => {
  const f = setup();
  f.actor(null);
  assert.equal(
    (
      await f
        .load("app/api/notes/tags/route")
        .GET(new Request("http://localhost"))
    ).status,
    401,
  );
  f.actor(owner);
  f.fail("note_tags");
  const r = await f
    .load("app/api/notes/tags/route")
    .GET(new Request("http://localhost"));
  assert.equal(r.status, 503);
  assert.doesNotMatch(await r.text(), /SELECT|credential|supabase|postgres/i);
});
test("foundation task compatibility retries only a definitively missing new RPC", async () => {
  for (const missing of [true, false]) {
    const f = setup(),
      calls = [];
    f.stubs["@/lib/supabaseAdmin"].supabaseAdmin.rpc = async (name, p) => {
      calls.push(name);
      if (name === "create_note_task_v2")
        return {
          data: null,
          error: missing
            ? {
                code: "PGRST202",
                message: "create_note_task_v2 not in schema cache",
              }
            : { code: "57014", message: "query timeout" },
        };
      return {
        data: { id: id(70), source_note_id: id(40), completed: false },
        error: null,
      };
    };
    const r = await f
      .load("app/api/notes/[id]/tasks/route")
      .POST(
        request({
          actionKey: id(90),
          title: "Review",
          contactId: f.contact.id,
          dueAt: null,
          approved: true,
        }),
        { params: Promise.resolve({ id: id(40) }) },
      );
    assert.equal(r.status, missing ? 200 : 503);
    assert.deepEqual(
      calls,
      missing
        ? ["create_note_task_v2", "create_note_task"]
        : ["create_note_task_v2"],
    );
  }
});
