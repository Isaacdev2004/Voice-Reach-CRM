/** Draft-only sender substitution. Never resolves recipient tokens or authorizes delivery. */
export const SENDER_LABELS = {
  agentName: "agent name",
  brokerage: "brokerage name",
  phone: "business phone",
  email: "business email",
  website: "business website",
  address: "business address",
  licenseNumber: "license number",
  jobTitle: "job title",
} as const;
export type SenderField = keyof typeof SENDER_LABELS;
export type SenderDetails = {
  values: Partial<Record<SenderField, string>>;
  sources: Partial<Record<SenderField, string>>;
  notices: string[];
};
export type VerifiedSenderAccount = {
  id: string;
  name: string;
  emailVerified: boolean;
  banned: boolean;
};
const record = (x: unknown): Record<string, unknown> =>
  x && typeof x === "object" && !Array.isArray(x) ? x as Record<string, unknown> : {};
function clean(x: unknown, max = 300) {
  if (typeof x !== "string") return "";
  const s = x.trim();
  if (!s || s.length > max || /[\r\n\x00-\x1f\x7f{}\[\]]/.test(s) ||
      /^(?:null|undefined|(?:my|your) workspace|your real estate team|your (?:name|agent|brokerage|company)|phone-placeholder)$/i.test(s)) return "";
  return s;
}
const normalize = (s: string) => s.toLocaleLowerCase("en-US").replace(/[^\p{L}\p{N}]/gu, "");
/** Same precedence as existing message previews: Brand Kit, saved sender/profile, workspace. */
export function resolveSenderDetails(settings: unknown, account: VerifiedSenderAccount): SenderDetails {
  const s = record(settings), kit = record(s.brandKit), profile = record(s.profile), workspace = record(s.workspace);
  const values: SenderDetails["values"] = {}, sources: SenderDetails["sources"] = {}, notices: string[] = [];
  const choose = (field: SenderField, candidates: [unknown, string][]) => {
    const valid = candidates.map(([value, source]) => [clean(value), source] as const).filter(([v]) => !!v);
    if (!valid.length) return;
    values[field] = valid[0][0]; sources[field] = valid[0][1];
    if (valid.some(([v]) => normalize(v) !== normalize(valid[0][0])))
      notices.push(`${SENDER_LABELS[field]} differs across your saved sources; using ${valid[0][1]} according to existing MyARI sender precedence. Review before saving.`);
  };
  choose("agentName", [[kit.agentName, "Brand Kit"], [workspace.defaultSenderName, "workspace sender"], [profile.fullName, "saved profile"], [account.name, "verified account profile"]]);
  choose("brokerage", [[kit.businessName, "Brand Kit"], [workspace.name, "saved workspace"]]);
  choose("phone", [[kit.phone, "Brand Kit"], [profile.phone, "saved profile"]]);
  // Account login email/phone and team roster are NOT assumed to be business contact details.
  choose("email", [[kit.email, "Brand Kit"]]);
  choose("website", [[kit.website, "Brand Kit"]]);
  choose("address", [[kit.address, "Brand Kit"]]);
  choose("licenseNumber", [[kit.licenseNumber, "Brand Kit"]]);
  choose("jobTitle", [[kit.jobTitle, "Brand Kit"], [profile.jobTitle, "saved profile"]]);
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) { delete values.email; delete sources.email; }
  if (values.phone && !/^\+?[\d\s().x#-]{5,50}$/i.test(values.phone)) { delete values.phone; delete sources.phone; }
  if (values.website) {
    try { const u = new URL(values.website); if (u.protocol !== "https:" || u.username || u.password) throw Error(); }
    catch { delete values.website; delete sources.website; }
  }
  if (Object.values(sources).includes("Brand Kit") && kit.approved !== true)
    notices.push("Saved Brand Kit details are for draft review; Brand Kit approval is still required where applicable. No delivery is authorized.");
  return { values, sources, notices };
}
const key = (s: string) => s.toLowerCase().replace(/[\s_.-]/g, "");
const aliases: Record<string, SenderField> = {
  agent: "agentName", agentname: "agentName", yourname: "agentName", sendername: "agentName",
  brokerage: "brokerage", brokeragename: "brokerage", businessname: "brokerage", companyname: "brokerage",
  agentphone: "phone", businessphone: "phone", officephone: "phone", phoneplaceholder: "phone", yourphone: "phone",
  agentemail: "email", businessemail: "email", youremail: "email",
  agentwebsite: "website", businesswebsite: "website", website: "website", yourwebsite: "website",
  businessaddress: "address", agentaddress: "address",
  licensenumber: "licenseNumber", agentlicensenumber: "licenseNumber",
  jobtitle: "jobTitle", agentjobtitle: "jobTitle",
};
export function personalizeSenderText(text: string, sender: SenderDetails) {
  const missing = new Set<SenderField>(), used = new Set<SenderField>();
  const replace = (match: string, raw: string) => {
    const completed = raw.match(/^Complete:\s*(.+)$/i);
    const field = completed
      ? (Object.keys(SENDER_LABELS) as SenderField[]).find(f => SENDER_LABELS[f] === completed[1])
      : Object.hasOwn(aliases, key(raw)) ? aliases[key(raw)] : undefined;
    if (!field) return match; // Contact and unknown/manual tokens stay byte-for-byte intact.
    used.add(field);
    const value = sender.values[field];
    if (value) return value;
    missing.add(field);
    return `[Complete: ${SENDER_LABELS[field]}]`;
  };
  // One pass prevents substituted business data from being interpreted as new tokens.
  const value = text.replace(/\{\{\s*([^{}]+?)\s*\}\}|\[([^\]\r\n]+)\]/g,
    (match, curly: string | undefined, bracket: string | undefined) => replace(match, curly ?? bracket ?? ""));
  return { value, missing: [...missing], used: [...used] };
}
export type DraftPersonalization = {
  source: "Your saved MyARI sender settings";
  missingFields: string[];
  notices: string[];
  sources: Partial<Record<SenderField, string>>;
  reviewRequired: true;
};
/** Only copy/script fields: never recipients, IDs, audience targeting, schedule or approvals. */
export function personalizeDraft<T extends { kind: string }>(action: T, sender: SenderDetails): { action: T; personalization: DraftPersonalization } {
  const missing = new Set<SenderField>(), used = new Set<SenderField>();
  const apply = (v: unknown) => {
    if (typeof v !== "string") return v;
    const r = personalizeSenderText(v, sender);
    r.missing.forEach(x => missing.add(x)); r.used.forEach(x => used.add(x));
    return r.value;
  };
  const a = action as T & Record<string, unknown>;
  let result: T = action;
  if (a.kind === "campaign" && Array.isArray(a.steps))
    result = { ...a, name: apply(a.name), description: apply(a.description), steps: a.steps.map((step: Record<string, unknown>) => ({ ...step, title: apply(step.title), description: apply(step.description) })) };
  else if (a.kind === "voice_script") result = { ...a, title: apply(a.title), script: apply(a.script) };
  else if (["sms", "email"].includes(a.kind)) result = { ...a, subject: apply(a.subject), body: apply(a.body) };
  return { action: result, personalization: {
    source: "Your saved MyARI sender settings", missingFields: [...missing].map(f => SENDER_LABELS[f]),
    notices: sender.notices, sources: sender.sources, reviewRequired: true,
  } };
}
