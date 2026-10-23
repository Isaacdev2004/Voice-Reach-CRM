import type { ScheduleItem } from "./model";
export function conflictsFor(
  items: ScheduleItem[],
  start: string,
  end: string,
  options: {
    excludeId?: string;
    bufferBefore?: number;
    bufferAfter?: number;
    travelMinutes?: number;
  } = {},
) {
  const before =
      ((options.bufferBefore ?? 0) + (options.travelMinutes ?? 0)) * 60000,
    after = (options.bufferAfter ?? 0) * 60000;
  return items
    .filter(
      (item) =>
        item.id !== options.excludeId &&
        item.busy !== false &&
        item.source !== "task" &&
        Date.parse(item.starts_at) - after < Date.parse(end) + before &&
        Date.parse(item.ends_at) + before > Date.parse(start) - after,
    )
    .map((item) => ({
      id: item.id,
      title: item.private ? "Busy" : item.title,
      start: item.starts_at,
      end: item.ends_at,
    }));
}
/** Visual interval partitioning: overlapping events receive independent columns. */
export function placeIntervals<
  T extends {
    id: string;
    top: number;
    bottom: number;
  },
>(events: T[]) {
  const sorted = [...events].sort(
    (a, b) => a.top - b.top || b.bottom - a.bottom || a.id.localeCompare(b.id),
  );
  const groups: T[][] = [];
  let boundary = -1;
  for (const item of sorted) {
    if (item.top >= boundary) {
      groups.push([]);
      boundary = item.bottom;
    } else boundary = Math.max(boundary, item.bottom);
    groups.at(-1)!.push(item);
  }
  return groups.flatMap((group) => {
    const ends: number[] = [];
    const placed = group.map((e) => {
      let lane = ends.findIndex((end) => end <= e.top);
      if (lane < 0) lane = ends.length;
      ends[lane] = e.bottom;
      return { ...e, lane };
    });
    return placed.map((e) => ({ ...e, lanes: ends.length }));
  });
}
