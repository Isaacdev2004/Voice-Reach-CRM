const { fixture, id, owner } = require("../campaign-audit/harness.cjs");
const other = "synthetic-subscriber-b";
const campaign = () => ({ kind: "campaign", name: "Apopka buyer follow-up", audience: "Apopka buyers", description: "Three thoughtful buyer follow-ups for review", durationDays: 7,
  steps: [
    { type: "sms", day: 1, title: "Apopka introduction", description: "Hi {{contact.firstName}}, this is [Agent Name] with [Brokerage]. Call [phone-placeholder] about Apopka homes. Reply STOP to opt out." },
    { type: "email", day: 3, title: "Apopka options from {{agent_name}}", description: "Subject: Your Apopka search\n\nHi {{first_name}}, [Agent Name] at [Brokerage] here. Reach me at {{agent_email}} or {{agent_phone}}. Visit {{agent_website}}." },
    { type: "voicemail", day: 7, title: "Apopka check-in", description: "Hi [FirstName], [AgentName] with [Brokerage]. Call [AgentPhone]." },
  ] });
function setup() {
  const f = fixture(); f.seed();
  const settings = {
    [owner]: { profile: { fullName: "Avery Agent", phone: "+15555550111" }, workspace: { defaultSenderName: "Avery Agent", name: "Avery Realty" }, brandKit: { agentName: "Avery Agent", businessName: "Avery Realty", phone: "+15555550111", email: "avery@example.test", website: "https://avery.example.test", approved: true } },
    [other]: { profile: { fullName: "Casey Agent", phone: "+15555550222" }, workspace: { defaultSenderName: "Casey Agent", name: "Casey Realty" }, brandKit: { agentName: "Casey Agent", businessName: "Casey Realty", phone: "+15555550222", email: "casey@example.test", website: "https://casey.example.test", approved: true } },
  };
  for (const [o, s] of Object.entries(settings)) f.tables.audit_logs.push({ id: crypto.randomUUID(), owner_id: o, entity_type: "user_settings", action: "SETTINGS_SAVED", created_at: new Date().toISOString(), metadata: { settings: s } });
  return { f, settings, model: f.load("lib/assistant/sender-personalization.ts"), proposals: f.load("lib/assistant/proposals.ts") };
}
module.exports = { setup, campaign, other, owner, id };
