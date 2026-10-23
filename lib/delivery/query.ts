import type { MessageRecord } from "./types";
export type DeliveryFilters = {
  q?: string;
  campaign?: string;
  contact?: string;
  channel?: string;
  status?: string;
  from?: string;
  to?: string;
  sort?: string;
  direction?: string;
  page?: number;
  pageSize?: number;
};
export function queryDelivery(
  records: MessageRecord[],
  filters: DeliveryFilters,
) {
  const q = filters.q?.trim().toLowerCase();
  const rows = records.filter(
    (r) =>
      (!q ||
        `${r.contact} ${r.campaign} ${r.step}`.toLowerCase().includes(q)) &&
      (!filters.campaign || r.campaign_id === filters.campaign) &&
      (!filters.contact || r.contact_id === filters.contact) &&
      (!filters.channel || r.channel === filters.channel) &&
      (!filters.status || r.status === filters.status) &&
      (!filters.from || r.created_at >= filters.from) &&
      (!filters.to || r.created_at < filters.to),
  );
  const sort =
    (
      {
        sent: "sentAt",
        delivered: "deliveredAt",
        contact: "contact",
        status: "status",
      } as const
    )[filters.sort as "sent"] ?? "created_at";
  rows.sort(
    (a, b) =>
      String(a[sort] ?? "").localeCompare(String(b[sort] ?? "")) *
        (filters.direction === "asc" ? 1 : -1) || a.id.localeCompare(b.id),
  );
  const pageSize = Math.max(1, Math.min(100, filters.pageSize ?? 25));
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.max(1, Math.min(pages, filters.page ?? 1));
  return {
    rows: rows.slice((page - 1) * pageSize, page * pageSize),
    matching: rows,
    page,
    pages,
    total: rows.length,
  };
}
