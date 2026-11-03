/* Isolated synthetic owners and intercepted services. Not hosted Clerk acceptance. */
const test = require("node:test"), assert = require("node:assert/strict");
const { setup, campaign, other, owner, id } = require("./assistant-personalization/fixture.cjs");
test("same Apopka campaign uses only each synthetic owner's sender information", async () => {
  const { f, proposals } = setup();
  const a = await proposals.prepareAction(owner, campaign());
  f.actor(other);
  const b = await proposals.prepareAction(other, campaign());
  for (const [p, own, foreign] of [[a, "Avery", "Casey"], [b, "Casey", "Avery"]]) {
    const text = JSON.stringify(p.action);
    assert.match(text, new RegExp(own)); assert.doesNotMatch(text, new RegExp(foreign));
    assert.ok(p.action.steps.every(s => s.description.includes(own)));
    assert.equal(p.action.steps[0].description.includes("{{contact.firstName}}"), true);
    assert.equal(p.action.steps[1].description.includes("{{first_name}}"), true);
    assert.equal(p.action.steps[2].description.includes("[FirstName]"), true);
    assert.deepEqual(p.preview.personalization.missingFields, []);
  }
  assert.equal(f.tables.campaigns.length, 1, "preparation must not create a campaign");
  assert.equal(f.tables.campaign_recipients.length, 1, "no enrollment");
  assert.equal(f.payloads.length, 0);
});
test("missing business fields stay explicit and do not use account login email or another owner", async () => {
  const { f, proposals, settings } = setup();
  delete settings[owner].brandKit.phone; delete settings[owner].profile.phone;
  delete settings[owner].brandKit.email; delete settings[owner].brandKit.website;
  const p = await proposals.prepareAction(owner, campaign());
  assert.match(p.action.steps[0].description, /\[Complete: business phone\]/);
  assert.match(p.action.steps[1].description, /\[Complete: business email\]/);
  assert.match(p.action.steps[1].description, /\[Complete: business website\]/);
  assert.doesNotMatch(JSON.stringify(p), /account@example.test|casey@example.test/);
  assert.deepEqual(new Set(p.preview.personalization.missingFields), new Set(["business phone", "business email", "business website"]));
  assert.equal(f.payloads.length, 0);
});
test("Brand Kit precedence is explicit for conflicting names, phone and brokerage", async () => {
  const { proposals, settings } = setup();
  settings[owner].profile.fullName = "Different Profile"; settings[owner].workspace.defaultSenderName = "Other Sender";
  settings[owner].profile.phone = "+15555550999"; settings[owner].workspace.name = "Different Workspace";
  const p = await proposals.prepareAction(owner, campaign());
  assert.match(p.action.steps[0].description, /Avery Agent with Avery Realty/);
  assert.match(p.action.steps[0].description, /\+15555550111/);
  assert.ok(p.preview.personalization.notices.length >= 3);
  assert.ok(p.preview.personalization.notices.every(n => n.includes("Brand Kit")));
});
test("campaign revision preserves personalized text, recipient tokens and approval lineage", async () => {
  const { proposals } = setup();
  const a = await proposals.prepareAction(owner, campaign());
  const b = await proposals.prepareAction(owner, { ...a.action, steps: a.action.steps.map((s, i) => ({ ...s, description: s.description + (i === 0 ? " Are you still looking in Apopka?" : "") })) }, { revisionOf: a.id });
  assert.equal(a.rootId, b.rootId);
  assert.match(b.action.steps[0].description, /still looking in Apopka/);
  assert.match(b.action.steps[0].description, /\{\{contact.firstName\}\}/);
  await assert.rejects(proposals.assertApproval(owner, a.id, a.digest), /superseded/);
  assert.equal((await proposals.assertApproval(owner, b.id, b.digest)).id, b.id);
});
test("sender settings changed after review invalidate old approval rather than silently rewriting it", async () => {
  const { proposals, settings } = setup();
  const p = await proposals.prepareAction(owner, campaign());
  settings[owner].brandKit.phone = "+15555550888";
  await assert.rejects(proposals.assertApproval(owner, p.id, p.digest), /context changed/);
  assert.match(p.action.steps[0].description, /\+15555550111/);
});
test("newly completed details resolve missing markers on revision", async () => {
  const { proposals, settings } = setup();
  delete settings[owner].brandKit.website;
  const p = await proposals.prepareAction(owner, campaign());
  settings[owner].brandKit.website = "https://avery.example.test";
  const r = await proposals.prepareAction(owner, p.action, { revisionOf: p.id });
  assert.match(r.action.steps[1].description, /https:\/\/avery.example.test/);
  assert.deepEqual(r.preview.personalization.missingFields, []);
  await proposals.assertApproval(owner, r.id, r.digest);
});
test("standalone voice, SMS and email use the same sender resolution", async () => {
  const { f, proposals } = setup();
  const voice = await proposals.prepareAction(owner, { kind: "voice_script", title: "Buyer call", script: "Hi [FirstName], [Agent Name] at [Brokerage]. [phone-placeholder]" });
  assert.match(voice.action.script, /Avery Agent at Avery Realty/);
  for (const kind of ["sms", "email"]) {
    const p = await proposals.prepareAction(owner, { kind, contactId: id(2), subject: kind === "email" ? "From [Agent Name]" : "", body: "Hello [FirstName], [Agent Name] with [Brokerage], [phone-placeholder]. Reply STOP to opt out." });
    assert.match(p.preview.body, /Avery Agent with Avery Realty/);
    assert.equal(p.executable, false, "outside-campaign messages must stay unsendable");
  }
  assert.equal(f.payloads.length, 0);
});
test("unknown/recipient fields, literal edits, and empty fields are not fabricated", () => {
  const { model } = setup();
  const sender = { values: { agentName: "Avery Agent" }, sources: {}, notices: [] };
  const source = "{{contact.firstName}} [FirstName] {{first_name}} [Phone Number] {{contact.phone}} [Comp1Address] Manual signature";
  assert.equal(model.personalizeSenderText(source, sender).value, source);
  assert.match(model.personalizeSenderText("[Brokerage]", sender).value, /Complete: brokerage name/);
});
test("invalid and placeholder business values cannot become facts or nested instructions", () => {
  const { model } = setup();
  const s = model.resolveSenderDetails({ brandKit: { agentName: "[Agent Name]", phone: "phone-placeholder", email: "not-email", website: "javascript:alert(1)" } }, { id: owner, name: "Avery Agent", emailVerified: true, banned: false });
  assert.equal(s.values.agentName, "Avery Agent");
  for (const k of ["phone", "email", "website"]) assert.equal(s.values[k], undefined);
  const defaults = model.resolveSenderDetails({ workspace: { name: "My workspace" } }, { id: owner, name: "", emailVerified: true, banned: false });
  assert.equal(defaults.values.brokerage, undefined);
  assert.equal(defaults.values.agentName, undefined);
});
test("sender loader fails closed for foreign, banned, unverified and unavailable accounts", async () => {
  const { f } = setup(); const { createSenderDetailsLoader } = f.load("lib/assistant/sender-profile.ts");
  const valid = { id: owner, name: "Avery Agent", emailVerified: true, banned: false };
  for (const account of [{ ...valid, id: other }, { ...valid, banned: true }, { ...valid, emailVerified: false }]) {
    const load = createSenderDetailsLoader({ settings: async o => { assert.equal(o, owner); return {}; }, account: async o => { assert.equal(o, owner); return account; } });
    await assert.rejects(load(owner), e => e.status === 403);
  }
  const unavailable = createSenderDetailsLoader({ settings: async () => ({}), account: async () => { throw Error("private upstream details"); } });
  await assert.rejects(unavailable(owner), e => e.status === 503 && !e.message.includes("upstream"));
  await assert.rejects(unavailable(""), e => e.status === 401);
});
test("anonymous and foreign owners cannot read a proposal or submit sender identity as action metadata", async () => {
  const { f, proposals } = setup(); const p = await proposals.prepareAction(owner, campaign());
  await assert.rejects(proposals.assertApproval(other, p.id, p.digest), /not found/);
  await assert.rejects(proposals.prepareAction(owner, { ...campaign(), ownerId: other }));
  f.actor(null);
  await assert.rejects(proposals.prepareAction(owner, campaign()), /could not be verified/);
});
test("sender read tool uses authenticated owner and rejects a caller-supplied owner", async () => {
  const { f } = setup(); const tools = f.load("lib/assistant/tools.ts");
  const a = await tools.runTool(owner, "read_sender_profile", {}, id(900));
  assert.equal(a.values.agentName, "Avery Agent");
  await assert.rejects(tools.runTool(owner, "read_sender_profile", { ownerId: other }, id(901)));
  f.actor(other);
  const b = await tools.runTool(other, "read_sender_profile", {}, id(902));
  assert.equal(b.values.agentName, "Casey Agent");
  assert.doesNotMatch(JSON.stringify(b), /Avery|avery@example/);
});
test("explicitly approved campaign save preserves personalized copy as draft with zero recipients or sends", async () => {
  const { f, proposals } = setup(); const p = await proposals.prepareAction(owner, campaign());
  const existingRecipients = structuredClone(f.tables.campaign_recipients);
  const result = await f.load("lib/assistant/execution.ts").executeApproved(owner, p.id, p.digest, "CONFIRM_SAVE");
  assert.equal(result.state, "completed");
  const saved = f.tables.campaigns.find(c => c.id === result.result.recordId);
  assert.ok(saved); assert.equal(saved.status, "draft"); assert.equal(saved.provider, "mock");
  const steps = f.tables.campaign_steps.filter(s => s.campaign_id === saved.id);
  assert.equal(steps.length, 3);
  assert.ok(steps.every(s => s.description.includes("Avery")));
  assert.ok(steps[0].description.includes("{{contact.firstName}}"));
  assert.deepEqual(f.tables.campaign_recipients, existingRecipients);
  assert.equal(f.payloads.length, 0);
  assert.equal((await f.load("lib/assistant/execution.ts").executeApproved(owner, p.id, p.digest, "CONFIRM_SAVE")).state, "completed");
  assert.equal(f.tables.campaigns.filter(c => c.id === saved.id).length, 1);
});
test("real proposal component renders completion guidance and review link without interpreting sender HTML", async () => {
  const { proposals, settings } = setup();
  settings[owner].brandKit.agentName = "Avery <Agent>"; delete settings[owner].brandKit.email;
  const p = await proposals.prepareAction(owner, campaign());
  const fs = require("node:fs"), path = require("node:path"), ts = require("typescript");
  const source = fs.readFileSync(path.join(__dirname, "../components/assistant/preview-details.tsx"), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const m = { exports: {} };
  new Function("require", "module", "exports", code)(name => name === "./workspace-icon" ? { WorkspaceIcon: () => null } : name === "./source-results" ? { StructuredData: () => null } : require(name), m, m.exports);
  const html = require("react-dom/server").renderToStaticMarkup(require("react").createElement(m.exports.PreviewDetails, { proposal: p }));
  assert.match(html, /Agent personalization/); assert.match(html, /business email/);
  assert.match(html, /\/dashboard\/settings\?tab=brand/);
  assert.match(html, /Avery &lt;Agent&gt;/); assert.doesNotMatch(html, /<Agent>/);
  assert.match(html, /\{\{contact.firstName\}\}/);
});
