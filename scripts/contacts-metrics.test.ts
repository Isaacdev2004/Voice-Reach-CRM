import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readContactSnapshot, type OwnedContact } from "../lib/contacts/read-snapshot";
import { contactMetricCounts } from "../lib/contacts/metrics";
import { filterContactsBySegment } from "../lib/contacts/lifecycle";
import { createContactListHandler } from "../lib/contacts/list-handler";
import { validateContactSnapshot } from "../lib/contacts/validate-snapshot";
import { withApiHandler } from "../lib/api-response";

function row(id: string, owner_id = "owner_a", type: string | null = "Cold Lead"): OwnedContact {
  return { id, owner_id, type, first_name: `Contact ${id}`, phone: "+15555550101", dnc: false,
    category: "Residential", consent_records: [{ status: "Unknown" }], created_at: "2026-01-01T00:00:00Z" };
}
function database(rows: OwnedContact[], options: { cap?: number; failAt?: number; wrongOwner?: boolean; totalDelta?: number; changeCountAt?: number } = {}) {
  const calls: { owner: string; offset: number }[] = [];
  const client = { from(table: string) {
    assert.equal(table, "contacts");
    let owner = "";
    return { select(columns: string, config: unknown) {
      assert.equal(columns, "*, consent_records(*)"); assert.deepEqual(config, { count: "exact" }); return this;
    }, eq(column: string, value: string) { assert.equal(column, "owner_id"); owner = value; return this; },
    order(column: string, config: unknown) { assert.equal(column, "id"); assert.deepEqual(config, { ascending: true }); return this; },
    async range(start: number, end: number) {
      calls.push({ owner, offset: start });
      assert.ok(owner); assert.equal(end - start, 499);
      if (calls.length === options.failAt) return { data: null, count: null, error: { message: "internal database detail" } };
      const scoped = rows.filter(r => r.owner_id === owner).sort((a, b) => a.id.localeCompare(b.id));
      const result = scoped.slice(start, start + Math.min(end - start + 1, options.cap ?? 500));
      return { data: options.wrongOwner && result.length ? [{ ...result[0], owner_id: "foreign" }] : result,
        count: scoped.length + (options.totalDelta ?? 0) + (calls.length === options.changeCountAt ? 1 : 0), error: null };
    } };
  } } as unknown as SupabaseClient;
  return { client, calls };
}
const stageRows = [row("cold"), row("residential", "owner_a", "Residential Lead"),
  row("imported", "owner_a", "Imported Contact"), row("active", "owner_a", "Active Lead"),
  row("warm", "owner_a", "Warm prospect"), row("past", "owner_a", "Residential Past Client")];

function handler(rows: OwnedContact[], owner = "owner_a") {
  const db = database(rows);
  const handle = createContactListHandler({ requireOwnerId: async () => owner,
    readContacts: id => readContactSnapshot(db.client, id), loadCategories: async () => ["Residential", "Commercial"] });
  return { handle, db };
}

test("all rows beyond the default response cap are counted exactly once; every page has an owner filter", async () => {
  const rows = Array.from({ length: 1207 }, (_, i) => row(String(i).padStart(5, "0"), "owner_a", i % 3 === 0 ? "Active Lead" : i % 3 === 1 ? "Past Client" : "Cold Lead"));
  rows.push(...Array.from({ length: 25 }, (_, i) => row(`foreign-${i}`, "owner_b")));
  const db = database(rows, { cap: 137 });
  const actual = await readContactSnapshot(db.client, "owner_a");
  assert.equal(actual.length, 1207); assert.ok(db.calls.length > 8);
  assert.ok(db.calls.every(c => c.owner === "owner_a"));
  const counts = contactMetricCounts(actual);
  assert.equal(counts.all, 1207); assert.equal(counts.coldLead + counts.activeLead + counts.pastClient, 1207);
});

test("existing lifecycle definitions and every segment filter form the same disjoint partition", () => {
  const counts = contactMetricCounts(stageRows);
  assert.deepEqual(counts, { all: 6, coldLead: 3, activeLead: 2, pastClient: 1 });
  assert.equal(filterContactsBySegment(stageRows, "cold-lead").length, counts.coldLead);
  assert.equal(filterContactsBySegment(stageRows, "active-lead").length, counts.activeLead);
  assert.equal(filterContactsBySegment(stageRows, "past-client").length, counts.pastClient);
  assert.equal(contactMetricCounts([...stageRows, stageRows[0]]).all, 6);
  assert.equal(contactMetricCounts([row("one"), row("two")]).all, 2, "same phone is still two distinct database contacts");
});

test("API tenant isolation ignores caller-supplied owner parameters", async () => {
  const rows = [...stageRows, row("other", "owner_b", "Past Client")];
  for (const owner of ["owner_a", "owner_b"]) {
    const { handle, db } = handler(rows, owner);
    const response = await handle(new Request("http://test/api/contacts?owner_id=owner_b"));
    const body = await response.json();
    assert.equal(body.total, owner === "owner_a" ? 6 : 1);
    assert.ok(body.contacts.every((c: OwnedContact) => c.owner_id === owner));
    assert.ok(db.calls.every(call => call.owner === owner));
  }
});

test("stage changes and hard deletions update counts and cohort membership on the next read", async () => {
  const rows = [row("one"), row("two", "owner_a", "Past Client")];
  const { handle } = handler(rows);
  const read = async (segment = "all") => (await handle(new Request(`http://test/api/contacts?segment=${segment}`))).json();
  assert.deepEqual((await read()).counts.coldLead, 1);
  rows[0].type = "Active Lead";
  assert.equal((await read()).counts.coldLead, 0); assert.equal((await read()).counts.activeLead, 1);
  assert.deepEqual((await read("active-lead")).contacts.map((c: OwnedContact) => c.id), ["one"]);
  rows[0].type = "Commercial Past Client";
  assert.equal((await read()).counts.pastClient, 2);
  rows.splice(0, 1);
  assert.equal((await read()).total, 1); assert.equal((await read()).counts.pastClient, 1);
});

test("API rows, filtered length and global metrics agree for stages, search and category", async () => {
  const { handle } = handler(stageRows);
  for (const stage of ["all", "cold-lead", "active-lead", "past-client"]) {
    const body = await (await handle(new Request(`http://test/api/contacts?segment=${stage}`))).json();
    assert.equal(body.contacts.length, body.filtered);
    assert.equal(body.filtered, stage === "all" ? body.counts.all : stage === "cold-lead" ? body.counts.coldLead : stage === "active-lead" ? body.counts.activeLead : body.counts.pastClient);
    assert.equal(body.total, 6); validateContactSnapshot(body);
  }
  const searched = await (await handle(new Request("http://test/api/contacts?q=active&category=Residential"))).json();
  assert.equal(searched.filtered, 1); assert.equal(searched.total, 6);
  const empty = await (await handler([]).handle(new Request("http://test/api/contacts"))).json();
  assert.deepEqual(empty.counts.all, 0); assert.deepEqual(empty.contacts, []); validateContactSnapshot(empty);
});

test("partial pages, changing totals and unexpected tenant rows fail closed instead of publishing counts", async () => {
  const rows = Array.from({ length: 600 }, (_, i) => row(String(i)));
  for (const options of [{ failAt: 2 }, { wrongOwner: true }, { totalDelta: 1 }, { changeCountAt: 2 }]) {
    await assert.rejects(readContactSnapshot(database(rows, options).client, "owner_a"), /complete contact totals/);
  }
  const handle = createContactListHandler({ requireOwnerId: async () => "owner_a", readContacts: async () => { throw new Error("private database credentials"); }, loadCategories: async () => [] });
  const response = await handle(new Request("http://test/api/contacts"));
  assert.equal(response.status, 503); const text = await response.text();
  assert.ok(!text.includes("credentials")); assert.ok(!text.includes('"counts"'));
});

test("unauthenticated and invalid-stage requests cannot query contacts", async () => {
  const never = async () => { throw new Error("database should not be called"); };
  const unauthorized = withApiHandler(createContactListHandler({ requireOwnerId: async () => { throw new Error("Unauthorized"); }, readContacts: never, loadCategories: never }));
  assert.equal((await unauthorized(new Request("http://test/api/contacts"), undefined)).status, 401);
  const invalid = createContactListHandler({ requireOwnerId: async () => "owner_a", readContacts: never, loadCategories: never });
  assert.equal((await invalid(new Request("http://test/api/contacts?segment=made-up"))).status, 400);
});

test("browser rejects duplicated, inconsistent or unverified totals rather than falling back to zero", () => {
  const payload = { success: true, complete: true, contacts: stageRows, total: 6, filtered: 6, counts: contactMetricCounts(stageRows) };
  validateContactSnapshot(payload, { ownerId: "owner_a", requireAll: true });
  assert.throws(() => validateContactSnapshot(payload, { ownerId: "owner_b" }));
  assert.throws(() => validateContactSnapshot({ ...payload, contacts: stageRows.slice(0, 2), filtered: 2 }, { requireAll: true }));
  assert.throws(() => validateContactSnapshot({ ...payload, complete: false }));
  assert.throws(() => validateContactSnapshot({ ...payload, success: false }));
  assert.throws(() => validateContactSnapshot({ ...payload, total: 234 }));
  assert.throws(() => validateContactSnapshot({ ...payload, contacts: [...stageRows.slice(0, 5), stageRows[0]] }));
  assert.throws(() => validateContactSnapshot({ ...payload, counts: { ...payload.counts, activeLead: 0 } }));
});
