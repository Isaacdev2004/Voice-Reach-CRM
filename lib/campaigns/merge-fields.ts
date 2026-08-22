export type MergeFieldContact = {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  source?: string | null;
  type?: string | null;
  preferred_area?: string | null;
  /** Property the lead inquired about / toured */
  property_address?: string | null;
  budget?: number | string | null;
};

export type MergeFieldContext = {
  contact: MergeFieldContact;
  agentName?: string | null;
  agentPhone?: string | null;
  brokerage?: string | null;
  marketArea?: string | null;
  city?: string | null;
  timezone?: string | null;
  /** One-off values (comps, listing stats) filled by the agent before send */
  extras?: Record<string, string | null | undefined>;
};

/** Tokens agents can use in SMS/email. Supports [FirstName] and {{first_name}}. */
export const MERGE_FIELD_GUIDE: { token: string; meaning: string; auto: boolean }[] = [
  { token: "{{first_name}}", meaning: "Contact first name", auto: true },
  { token: "{{property_address}}", meaning: "Home they asked about / toured", auto: true },
  { token: "{{area}}", meaning: "Preferred area / neighborhood", auto: true },
  { token: "{{agent_name}}", meaning: "Your sender name (Settings)", auto: true },
  { token: "[AgentPhone]", meaning: "Your phone (Settings → Profile)", auto: true },
  { token: "[Brokerage]", meaning: "Workspace name", auto: true },
  {
    token: "[Comp1Address]",
    meaning: "Manual — paste real comps into the step before sending",
    auto: false,
  },
];

function clean(value: string | null | undefined, fallback = ""): string {
  const v = (value ?? "").trim();
  return v || fallback;
}

function money(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return clean(String(value));
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function normalizeKey(key: string): string {
  return key.trim().replace(/\s+/g, " ");
}

/**
 * Replace campaign placeholders like [FirstName], [Agent], {{first_name}}.
 * Unknown tokens are left as-is so agents can spot missing data.
 */
export function applyMergeFields(template: string, ctx: MergeFieldContext): string {
  if (!template) return template;

  const first = clean(ctx.contact.first_name, "there");
  const last = clean(ctx.contact.last_name);
  const fullName = clean(`${first} ${last}`.trim(), first);
  const agent = clean(ctx.agentName, "your agent");
  const brokerage = clean(ctx.brokerage, "ARI");
  const agentPhone = clean(ctx.agentPhone);
  const preferredArea = clean(ctx.contact.preferred_area);
  const property = clean(
    ctx.contact.property_address,
    preferredArea ? `a home in ${preferredArea}` : "the home you asked about",
  );
  const city = clean(ctx.city, preferredArea || clean(ctx.marketArea, "your area"));
  const market = clean(preferredArea || ctx.marketArea, city);
  const area = preferredArea || market;
  const budget = money(ctx.contact.budget);

  const map: Record<string, string> = {
    FirstName: first,
    first_name: first,
    LastName: last,
    last_name: last,
    FullName: fullName,
    Name: fullName,
    Agent: agent,
    agent_name: agent,
    "Your name": agent,
    AgentPhone: agentPhone,
    agent_phone: agentPhone,
    Brokerage: brokerage,
    brokerage_name: brokerage,
    City: city,
    city: city,
    Market: market,
    MarketArea: market,
    market_area: market,
    area: area,
    Area: area,
    Phone: clean(ctx.contact.phone),
    Email: clean(ctx.contact.email),
    LeadSource: clean(ctx.contact.source, "your inquiry"),
    lead_source: clean(ctx.contact.source, "your inquiry"),
    PropertyAddress: property,
    property_address: property,
    Neighborhood: area,
    neighborhood: area,
    Budget: budget,
    budget: budget,
  };

  for (const [key, value] of Object.entries(ctx.extras ?? {})) {
    if (!key) continue;
    const v = clean(value);
    if (!v) continue;
    map[key] = v;
    map[key.replace(/\s+/g, "")] = v;
  }

  const lookup = (rawKey: string): string | null => {
    const k = normalizeKey(rawKey);
    if (k in map) return map[k];
    const compact = k.replace(/\s+/g, "");
    if (compact in map) return map[compact];
    const lower = k.toLowerCase();
    for (const [mk, mv] of Object.entries(map)) {
      if (mk.toLowerCase() === lower) return mv;
    }
    return null;
  };

  return template
    .replace(/\[([^\]]+)\]/g, (match, key: string) => {
      const found = lookup(key);
      return found !== null ? found : match;
    })
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
      const found = lookup(key);
      return found !== null ? found : match;
    });
}

/** Tokens still present after merge — usually comps / listing stats the agent must fill. */
export function findUnresolvedMergeFields(text: string): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const m of text.matchAll(/\[([^\]]+)\]/g)) {
    const inner = m[1]?.trim();
    if (inner) found.add(`[${inner}]`);
  }
  for (const m of text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
    const inner = m[1]?.trim();
    if (inner) found.add(`{{${inner}}}`);
  }
  return [...found];
}

/** Pull "Subject: ..." from the first line of an email template body. */
export function splitEmailSubjectBody(raw: string): { subject: string | null; body: string } {
  const text = raw.trim();
  const match = text.match(/^Subject:\s*(.+)\s*\n+([\s\S]*)$/i);
  if (!match) return { subject: null, body: text };
  return { subject: match[1].trim(), body: match[2].trim() };
}
