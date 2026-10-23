/* Isolated in-memory service boundaries. Never reads configured credentials or connects to live services. */
const fs = require("node:fs"),
  path = require("node:path"),
  ts = require("typescript");
const root = path.resolve(__dirname, "../..");
const owner = "qa-owner",
  id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function fixture() {
  const tables = {
    calendar_events: [],
    calendar_connections: [],
    contact_tasks: [],
    contact_notes: [],
    calendar_share_links: [],
    calendar_booking_requests: [],
    campaigns: [],
    campaign_steps: [],
    campaign_recipients: [],
    campaign_step_runs: [],
    contacts: [],
    consent_records: [],
    engagement_events: [],
    voice_assets: [],
    audit_logs: [],
    provider_webhooks: [],
    outbound_messages: [],
    outbound_delivery_events: [],
    provider_sync_runs: [],
  };
  const calls = [],
    payloads = [],
    engagement = [];
  let actor = owner,
    fail = null,
    seq = 900;
  const settings = {
    workspace: {
      name: "Example Realty",
      defaultSenderName: "Avery Agent",
      quietHoursStart: "00:00",
      quietHoursEnd: "00:00",
      requireConsentProof: true,
    },
    profile: {
      fullName: "Avery Agent",
      phone: "+15555550199",
      timezone: "America/New_York",
    },
  };
  const db = {
    from(table) {
      let mode = "select",
        value,
        single = false,
        limit = Infinity,
        range = null;
      const filters = [],
        orders = [];
      const q = {
        select() {
          return q;
        },
        eq(k, v) {
          filters.push((r) => k.includes("->>") ? r[k.split("->>")[0]]?.[k.split("->>")[1]] === v : r[k] === v);
          calls.push({ table, filter: k, value: v });
          return q;
        },
        is(k,v){filters.push(r=>v===null?r[k]==null:r[k]===v);calls.push({table,filter:k,value:v});return q;},
        neq(k, v) {
          filters.push((r) => r[k] !== v);
          return q;
        },
        or(expression){
          const clauses=expression.split(',').map(part=>/^([a-z_]+)\.ilike\.%([\s\S]*)%$/.exec(part));
          if(clauses.some(v=>!v))throw Error('Unsupported synthetic OR expression');
          filters.push(r=>clauses.some(v=>String(r[v[1]]??'').toLowerCase().includes(v[2].toLowerCase())));
          calls.push({table,filter:'or',value:expression});return q;
        },
        ilike(k,v){filters.push(r=>String(r[k]??'').replace(/\D/g,'').endsWith(String(v).replace(/\D/g,'')));return q;},
        in(k, v) {
          filters.push((r) => v.includes(r[k]));
          return q;
        },
        lt(k,v){filters.push(r=>r[k]<v);return q;},
      lte(k, v) {
          filters.push((r) => r[k] <= v);
          return q;
        },
        gt(k,v){filters.push(r=>r[k]>v);return q;},
        gte(k, v) {
          filters.push((r) => r[k] >= v);
          return q;
        },
        order(k, o) {
          orders.push([k, o?.ascending !== false]);
          return q;
        },
        limit(n) {
          limit = n;
          return q;
        },
        range(a, b) {
          range = [a, b];
          return q;
        },
        maybeSingle() {
          single = true;
          return q;
        },
        single() {
          single = true;
          return q;
        },
        upsert(v){mode="upsert";value=v;return q;},
        insert(v) {
          mode = "insert";
          value = v;
          return q;
        },
        update(v) {
          mode = "update";
          value = v;
          return q;
        },
        delete() {
          mode = "delete";
          return q;
        },
        then(resolve, reject) {
          return Promise.resolve()
            .then(() => {
              calls.push({ table, mode, value });
              if (fail === table)
                return {
                  data: null,
                  error: { message: "private database trace" },
                };
              const all = tables[table] ?? [];
              let rows = all.filter((r) => filters.every((f) => f(r)));
              const count = rows.length;
              if (mode === "insert" && table === "outbound_delivery_events" && all.some(r=>r.provider===value.provider&&r.event_key===value.event_key)) return {data:null,error:{code:"23505"},count};
              if(mode==="upsert"){const existing=all.find(r=>r.owner_id===value.owner_id&&r.provider===value.provider&&r.external_event_id===value.external_event_id);if(existing){Object.assign(existing,value);rows=[existing];}else{mode="insert";}}
              if (mode === "insert") {
                rows = (Array.isArray(value) ? value : [value]).map((r) => ({
                  id: id(seq++),
                  created_at: "2026-10-22T12:00:00Z",
                  ...(table === "outbound_delivery_events" ? {received_at:"2026-10-23T12:00:00Z"}:{}),
                  ...r,
                }));
                tables[table].push(...rows);
              }
              if (mode === "update")
                rows.forEach((r) => Object.assign(r, value));
              if (mode === "delete")
                tables[table] = all.filter((r) => !rows.includes(r));
              if (orders.length)
                rows = [...rows].sort((a, b) => {
                  for (const [k, asc] of orders) {
                    const c = String(a[k] ?? "").localeCompare(
                      String(b[k] ?? ""),
                    );
                    if (c) return asc ? c : -c;
                  }
                  return 0;
                });
              if (range) rows = rows.slice(range[0], range[1] + 1);
              rows = rows.slice(0, limit);
              return {
                data: structuredClone(single ? (rows[0] ?? null) : rows),
                error: null,
                count,
              };
            })
            .then(resolve, reject);
        },
      };
      return q;
    },
  };
  const stubs = {
    "@/lib/automations/engine":{evaluateTriggers:async event=>{calls.push({trigger:event});return[];}},
    "@/lib/auth": {
      requireUserId: async () => {
        if (!actor) throw Error("Unauthorized");
        return actor;
      },
    },
    "@/lib/supabaseAdmin": { supabaseAdmin: db },
    "@/lib/audit": { writeAuditLog: async (e) => calls.push({ audit: e }) },
    "@/lib/settings/load-workspace": {
      loadWorkspaceSettings: async () => structuredClone(settings),
    },
    "@/lib/calendar/sync": {
      syncCallbackStepToCalendar: async () => ({
        synced: true,
        eventId: id(800),
      }),
    },
    "@/lib/engagement/record": {
      recordEngagementEvent: async (e) => engagement.push(e),
    },
    "@/lib/providers/registry": {
      pickAdapterForChannel: () => ({ id: "mock" }),
      isLiveProvidersConfigured: () => ({
        sms: true,
        email: true,
        voicemail: true,
      }),
      dispatch: async (request) => {
        payloads.push(request);
        return { ok: true, status: "mock_sent", providerMessageId: "mock-qa" };
      },
    },
    "@/lib/billing/plan-limits": {
      assertCanSendChannel: async () => ({ ok: true }),
    },
    "@/lib/voice/signed-audio": {
      voiceAssetReady: (a) => !!a?.approved,
      signVoiceAssetUrl: async () => "https://media.example.test/approved.wav",
    },
  };
  const cache = new Map();
  function load(file) {
    file = path.resolve(root, file);
    if (!path.extname(file)) file += ".ts";
    if (cache.has(file)) return cache.get(file).exports;
    const m = { exports: {} };
    cache.set(file, m);
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    new Function("require", "module", "exports", code)(
      (name) =>
        stubs[name] ??
        (name.startsWith("@/")
          ? load(name.slice(2))
          : name.startsWith(".")
            ? load(path.resolve(path.dirname(file), name))
            : require(name)),
      m,
      m.exports,
    );
    return m.exports;
  }
  const contact = {
    id: id(2),
    owner_id: owner,
    first_name: "Jordan",
    last_name: "Lee",
    phone: "+15555550123",
    email: "jordan@example.test",
    preferred_area: "Winter Park",
    property_address: "123 Example Lane",
    dnc: false,
    opt_out_requested: false,
    consent_records: [
      {
        id: id(8),
        owner_id: owner,
        contact_id: id(2),
        status: "Yes",
        consent_date: "2026-10-01",
        source: "Isolated test",
        proof_reference: "Fixture only",
        created_at: "2026-10-01T12:00:00Z",
      },
    ],
  };
  function seed(step) {
    tables.campaigns.push({
      id: id(1),
      owner_id: owner,
      name: "QA campaign",
      status: "queued",
      provider: "mock",
      live_launched: false,
      voice_asset_id: id(7),
    });
    tables.contacts.push(structuredClone(contact));
    tables.voice_assets.push({
      id: id(7),
      owner_id: owner,
      approved: true,
      storage_path: owner + "/qa.wav",
    });
    const dbStep = {
      id: id(3),
      campaign_id: id(1),
      owner_id: owner,
      step_order: 1,
      type: "email",
      title: "Subject",
      description: "Hi {{first_name}}, this is {{agent_name}}.",
      delay_minutes: 0,
      time_label: "Immediate",
      ...step,
    };
    tables.campaign_steps.push(dbStep);
    const rec = {
      id: id(4),
      campaign_id: id(1),
      contact_id: id(2),
      owner_id: owner,
      eligibility_status: "eligible",
      delivery_status: "not_sent",
      created_at: "2026-01-01T12:00:00Z",
      contacts: tables.contacts[0],
    };
    tables.campaign_recipients.push(rec);
    tables.campaign_step_runs.push({
      id: id(5),
      owner_id: owner,
      campaign_id: id(1),
      step_id: dbStep.id,
      recipient_id: rec.id,
      status: "scheduled",
      scheduled_at: "2026-01-01T12:00:00Z",
      created_at: "2026-01-01T12:00:00Z",
      campaign_steps: dbStep,
      campaign_recipients: rec,
    });
  }
  return {
    load,
    tables,
    calls,
    payloads,
    engagement,
    stubs,
    settings,
    contact,
    seed,
    owner,
    id,
    fail: (t) => (fail = t),
    actor: (v) => (actor = v),
  };
}
module.exports = { fixture, id, owner };
