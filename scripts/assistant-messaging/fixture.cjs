/* Synthetic subscribers and real local validation/dispatch code. Every provider fetch is intercepted. */
const { fixture, id, owner } = require("../campaign-audit/harness.cjs");
const {randomBytes}=require("node:crypto");
const syntheticIsvKey=randomBytes(32);
const VALUES = {
  MANAGED_SMS_PILOT_ENABLED:"true",
  TWILIO_ISV_TOKEN_KEYRING:JSON.stringify({test:syntheticIsvKey.toString("base64")}),
  TWILIO_ISV_TOKEN_ACTIVE_KEY_ID:"test",
  ASSISTANT_V2_ENABLED: "true",
  ASSISTANT_V2_OWNER_IDS: owner,
  ASSISTANT_REASONING_PROVIDER: "openai",
  ASSISTANT_APPROVED_SENDS_ENABLED: "true",
  ASSISTANT_SEND_OWNER_IDS: owner,
  ASSISTANT_SEND_RECIPIENTS: "+15555550123,jordan@example.test",
  ALLOW_LIVE_OUTBOUND: "true",
  MYARI_AI_ENTITLEMENTS_ENABLED: "false",
  DELIVERY_EVIDENCE_ENABLED: "true",
  TWILIO_ACCOUNT_SID: "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  TWILIO_AUTH_TOKEN: "SYNTHETIC_NEVER_LIVE",
  TWILIO_FROM_NUMBER: "+15555550001",
  RESEND_API_KEY: "re_synthetic_never_live",
  RESEND_FROM_EMAIL: "MyARI Beta <beta@example.test>",
  APP_BASE_URL: "https://myari.example.test",
  OPENAI_API_KEY: "synthetic_never_live",
};
function setup() {
  const previous = {};
  for (const [k, v] of Object.entries(VALUES)) {
    previous[k] = process.env[k];
    process.env[k] = v;
  }
  const originalFetch = global.fetch;
  const f = fixture();
  f.seed();
  f.tables.campaigns[0].provider = "live";
  f.tables.campaigns[0].live_launched = true;
  f.tables.consent_records.push(...structuredClone(f.contact.consent_records));
  for (const t of [
    "communication_suppressions",
    "outbound_messages",
    "outbound_delivery_events",
    "provider_sync_runs",
  ])
    f.tables[t] = [];
  // Approved synthetic subaccount, never a real provider identity. DB authorization is tested separately with PostgreSQL.
  const crypto=f.load("lib/messaging/isv/credentials.ts");
  f.tables.isv_sms_assignments=[{id:id(800),owner_id:owner,business_id:id(801),account_sid:VALUES.TWILIO_ACCOUNT_SID,from_number:VALUES.TWILIO_FROM_NUMBER,messaging_service_sid:"MG"+"c".repeat(32),active:true}];
  f.tables.isv_provider_credentials=[{owner_id:owner,account_sid:VALUES.TWILIO_ACCOUNT_SID,envelope:crypto.sealCredential(VALUES.TWILIO_AUTH_TOKEN,{owner,accountSid:VALUES.TWILIO_ACCOUNT_SID},"test",syntheticIsvKey)}];
  f.tables.isv_sms_dispatches=[];
  const db=f.stubs["@/lib/supabaseAdmin"].supabaseAdmin,originalRpc=db.rpc.bind(db),claimed=new Set();
  db.rpc=async(name,p)=>{if(name==="isv_project_delivery")return {data:0,error:null};if(name!=="isv_claim_sms")return originalRpc(name,p);if(claimed.has(p.p_key))return {data:false};claimed.add(p.p_key);f.tables.isv_sms_dispatches.push({owner_id:p.p_owner,operation_key:p.p_key,state:"dispatching"});return {data:true};};
  f.tables.audit_logs.push({
    id: id(500),
    owner_id: owner,
    entity_type: "user_settings",
    action: "SETTINGS_SAVED",
    created_at: new Date().toISOString(),
    metadata: {
      settings: {
        workspace: f.settings.workspace,
        profile: f.settings.profile,
        brandKit: { agentName: "Avery Agent", email: "avery@example.test" },
      },
    },
  });
  delete f.stubs["@/lib/providers/registry"];
  const transmissions = [],
    trace = [];
  let mode = "success",
    action = null;
  global.fetch = async (url, options = {}) => {
    const href = String(url);
    if (href === "https://api.openai.com/v1/responses") {
      const request = JSON.parse(options.body);
      trace.push("reasoning");
      const followup = request.input.some(
        (p) => p.type === "function_call_output",
      );
      return new Response(
        JSON.stringify({
          status: "completed",
          model: "gpt-5-mini",
          usage: { input_tokens: 30, output_tokens: 20 },
          output: followup
            ? [
                {
                  type: "message",
                  content: [
                    {
                      type: "output_text",
                      text: "Review the exact message below. Nothing has been sent.",
                    },
                  ],
                },
              ]
            : [
                {
                  type: "function_call",
                  call_id: "synthetic-call-1",
                  name: "prepare_message",
                  arguments: JSON.stringify(action),
                },
              ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }
    if (
      !href.startsWith("https://api.twilio.com/") &&
      href !== "https://api.resend.com/emails"
    )
      throw Error("Network blocked by synthetic fixture: " + href);
    trace.push("provider_submission");
    transmissions.push({
      url: href,
      options: { ...options, headers: undefined },
      body: href.includes("twilio")
        ? Object.fromEntries(new URLSearchParams(options.body))
        : JSON.parse(options.body),
    });
    if (mode === "evidence-failure") f.fail("outbound_delivery_events");
    if (mode === "timeout")
      throw new DOMException(
        "Synthetic timeout after a possible provider acceptance",
        "TimeoutError",
      );
    if (mode === "outage")
      return new Response(
        JSON.stringify({ message: "Synthetic unavailable", code: 503 }),
        { status: 503 },
      );
    if (mode === "invalid-reference")
      return new Response(
        JSON.stringify(href.includes("twilio") ? { sid: "   " } : { id: 7 }),
        { status: 202 },
      );
    if (mode === "missing-reference")
      return new Response("{}", { status: 202 });
    return new Response(
      JSON.stringify(
        href.includes("twilio")
          ? { sid: "SMbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", status: "queued" }
          : { id: "EMAIL_SYNTHETIC" },
      ),
      { status: 201, headers: { "content-type": "application/json" } },
    );
  };
  const message = (kind = "sms") => ({
    kind,
    contactId: id(2),
    campaignId: id(1),
    recipientId: id(4),
    body: "Hi Jordan, does Friday work? Reply STOP to opt out.",
    subject: kind === "email" ? "Friday consultation" : "",
  });
  const preview = (kind = "sms") =>
    f.load("lib/assistant/proposals.ts").prepareAction(owner, message(kind));
  const approve = async (p, body = {}) => {
    trace.push("send_confirmation");
    return f.load("app/api/assistant/approve/route.ts").POST(
      new Request("https://myari.example.test/api/assistant/approve", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-MyARI-Owner": owner,
        },
        body: JSON.stringify({
          proposalId: p.id,
          digest: p.digest,
          confirmation: "CONFIRM_SEND",
          ...body,
        }),
      }),
    );
  };
  return {
    f,
    id,
    owner,
    message,
    preview,
    approve,
    transmissions,
    trace,
    setMode: (v) => (mode = v),
    setAction: (v) => (action = v),
    restore() {
      global.fetch = originalFetch;
      for (const [k, v] of Object.entries(previous)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    },
  };
}
module.exports = { setup, id, owner };
