import { contactSegment } from "@/lib/contacts/lifecycle";
import type { ApiContact } from "@/lib/hooks/use-contacts";

export type CampaignRow = {
  status: string;
  created_at?: string;
  confirmedSent?: boolean;
};

const SENT_STATUSES = new Set(["sent", "partial", "sending"]);
const ACTIVE_STATUSES = new Set(["sending", "queued"]);

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export function contactsAddedThisMonth(contacts: ApiContact[]): number {
  const start = startOfMonth(new Date());
  return contacts.filter((c) => {
    const raw = (c as ApiContact & { created_at?: string }).created_at;
    if (!raw) return false;
    return new Date(raw) >= start;
  }).length;
}

export function contactsAddedSince(contacts: ApiContact[], since: Date): number {
  return contacts.filter((c) => {
    const raw = (c as ApiContact & { created_at?: string }).created_at;
    if (!raw) return false;
    return new Date(raw) >= since;
  }).length;
}

export function monthOverMonthContactChange(contacts: ApiContact[]): string | undefined {
  const now = new Date();
  const thisStart = startOfMonth(now);
  const lastStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const thisMonth = contactsAddedSince(contacts, thisStart);
  const lastMonth = contacts.filter((c) => {
    const raw = (c as ApiContact & { created_at?: string }).created_at;
    if (!raw) return false;
    const t = new Date(raw);
    return t >= lastStart && t < thisStart;
  }).length;
  if (lastMonth === 0) {
    if (thisMonth === 0) return undefined;
    return `+${thisMonth} new`;
  }
  const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  if (pct === 0) return "Flat vs last month";
  return pct > 0 ? `+${pct}% vs last month` : `${pct}% vs last month`;
}

export function countSentCampaigns(campaigns: CampaignRow[]): number {
  return campaigns.filter((c) => c.confirmedSent === true).length;
}

export function countActiveCampaigns(campaigns: CampaignRow[]): number {
  return campaigns.filter((c) => ACTIVE_STATUSES.has(c.status)).length;
}

export function campaignsLaunchedThisMonth(campaigns: CampaignRow[]): number {
  const start = startOfMonth(new Date());
  return campaigns.filter((c) => {
    if (!SENT_STATUSES.has(c.status)) return false;
    if (!c.created_at) return false;
    return new Date(c.created_at) >= start;
  }).length;
}

function parseContactBudget(raw: ApiContact["budget"]): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export type ActiveLeadBudgetSummary = {
  total: number;
  withBudget: number;
  activeLeadCount: number;
};

/** Sum buyer budgets on file for active-lead contacts only (not a closed pipeline forecast). */
export function sumActiveLeadBudgets(contacts: ApiContact[]): ActiveLeadBudgetSummary {
  let total = 0;
  let withBudget = 0;
  let activeLeadCount = 0;
  for (const c of contacts) {
    if (contactSegment(c.type) !== "active-lead") continue;
    activeLeadCount += 1;
    const budget = parseContactBudget(c.budget);
    if (budget === null) continue;
    withBudget += 1;
    total += budget;
  }
  return { total, withBudget, activeLeadCount };
}

export function formatPipelineValueDisplay(summary: ActiveLeadBudgetSummary): string {
  if (summary.withBudget === 0) return "—";
  const n = summary.total;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

export function newOpportunitiesThisWeek(contacts: ApiContact[], activeLeadCount: number): number {
  const weekStart = daysAgo(7);
  const becameActive = contacts.filter((c) => {
    const raw = (c as ApiContact & { created_at?: string }).created_at;
    if (!raw) return false;
    const seg = c.type?.toLowerCase() ?? "";
    const isActive = /active|hot|warm|buyer|seller/i.test(seg);
    return isActive && new Date(raw) >= weekStart;
  }).length;
  return becameActive > 0 ? becameActive : Math.min(activeLeadCount, contactsAddedSince(contacts, weekStart));
}
