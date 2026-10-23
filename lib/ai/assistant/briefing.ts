export type BriefingRow = {
  id: string;
  title?: string;
  due_at?: string | null;
  starts_at?: string;
  completed?: boolean;
  [key: string]: unknown;
};
export function taskBriefing(rows: BriefingRow[], now: Date) {
  const end = new Date(now.getTime() + 24 * 3600000).getTime();
  return rows
    .filter(
      (r) =>
        !r.completed &&
        r.due_at &&
        Number.isFinite(Date.parse(r.due_at)) &&
        Date.parse(r.due_at) <= end,
    )
    .sort((a, b) => Date.parse(a.due_at!) - Date.parse(b.due_at!))
    .map((r) => ({
      id: r.id,
      title: r.title ?? "Follow-up",
      date: r.due_at,
      overdue: Date.parse(r.due_at!) < now.getTime(),
      href: `/dashboard/tasks?taskId=${r.id}`,
    }));
}
