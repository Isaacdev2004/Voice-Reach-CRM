export type MergeFieldContact = {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  source?: string | null;
  type?: string | null;
};

export type MergeFieldContext = {
  contact: MergeFieldContact;
  agentName?: string | null;
  agentPhone?: string | null;
  brokerage?: string | null;
  marketArea?: string | null;
  city?: string | null;
  timezone?: string | null;
};

function clean(value: string | null | undefined, fallback = ""): string {
  const v = (value ?? "").trim();
  return v || fallback;
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
  const city = clean(ctx.city, clean(ctx.marketArea, "your area"));
  const market = clean(ctx.marketArea, city);

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
    Market: market,
    MarketArea: market,
    market_area: market,
    Phone: clean(ctx.contact.phone),
    Email: clean(ctx.contact.email),
    LeadSource: clean(ctx.contact.source, "your inquiry"),
    lead_source: clean(ctx.contact.source, "your inquiry"),
    PropertyAddress: "the home you asked about",
    property_address: "the home you asked about",
    Neighborhood: city,
    neighborhood: city,
  };

  return template
    .replace(/\[([^\]]+)\]/g, (match, key: string) => {
      const k = key.trim();
      return k in map ? map[k] : match;
    })
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
      return key in map ? map[key] : match;
    });
}

/** Pull "Subject: ..." from the first line of an email template body. */
export function splitEmailSubjectBody(raw: string): { subject: string | null; body: string } {
  const text = raw.trim();
  const match = text.match(/^Subject:\s*(.+)\s*\n+([\s\S]*)$/i);
  if (!match) return { subject: null, body: text };
  return { subject: match[1].trim(), body: match[2].trim() };
}
