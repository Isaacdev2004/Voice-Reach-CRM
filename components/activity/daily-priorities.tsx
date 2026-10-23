"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
type Priority = {
  id: string;
  title: string;
  contact: string;
  at: string;
  status: string;
  href: string;
};
export function DailyPriorities({
  compact = false,
  dashboard = false,
  timezone,
}: {
  compact?: boolean;
  dashboard?: boolean;
  timezone?: string;
}) {
  const { user } = useUser();
  const [displayZone, setDisplayZone] = useState(
    timezone ?? "America/New_York",
  );
  const [items, setItems] = useState<Priority[]>([]),
    [error, setError] = useState(false),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(false);
    setItems([]);
    fetch(
      `/api/activity/priorities${timezone ? "?timezone=" + encodeURIComponent(timezone) : ""}`,
      {
        signal: ac.signal,
        cache: "no-store",
      },
    )
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok || d.success === false || !Array.isArray(d.items))
          throw Error();
        if (!ac.signal.aborted) {
          setItems(d.items);
          setDisplayZone(d.timezone ?? timezone ?? "America/New_York");
        }
      })
      .catch(() => {
        if (!ac.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    window.addEventListener("focus", refresh);
    window.addEventListener("myari:activity-changed", refresh);
    return () => {
      ac.abort();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("myari:activity-changed", refresh);
    };
  }, [user?.id, timezone, version, refresh]);
  return (
    <section
      data-morning-briefing-source="verified-priorities"
      className={`${dashboard ? "dashboard-priorities " : ""}rounded-2xl border border-[#eee7de] bg-[#fffdfa] p-4 ${compact ? "" : "my-3"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-[19px] text-ink">Daily priorities</h2>
        <button
          type="button"
          onClick={refresh}
          className="text-[11px] text-rose-gold-deep"
        >
          Refresh
        </button>
      </div>
      {loading ? (
        <p className="py-3 text-[12px] text-taupe" role="status">
          Loading priorities…
        </p>
      ) : error ? (
        <p className="py-3 text-[12px] text-taupe" role="alert">
          Priorities could not be loaded.
        </p>
      ) : !items.length ? (
        <p className="py-3 text-[12px] text-taupe">
          No overdue or due-today tasks or upcoming client appointments
          recorded.
        </p>
      ) : (
        <ul className={compact ? "" : "grid gap-x-6 md:grid-cols-2"}>
          {items.slice(0, compact ? 4 : 8).map((i) => (
            <li
              key={i.id}
              className="border-b border-[#eee7de] py-3 text-[12px]"
            >
              <Link href={i.href} className="block">
                <span className="text-[10px] font-medium uppercase tracking-wide text-[#96633f]">
                  {i.status}
                </span>
                <strong className="block font-medium text-ink">
                  {i.title}
                </strong>
                <span className="text-taupe">
                  {i.contact} ·{" "}
                  {new Date(i.at).toLocaleString("en-US", {
                    timeZone: displayZone,
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {dashboard ? (
        <div className="dashboard-priorities-actions">
          <Link href="/dashboard/tasks">Review tasks →</Link>
          <Link href="/dashboard/calendar">Open calendar →</Link>
          <Link href="/dashboard/activity">Review conversations →</Link>
          <span>Reply status is not tracked in this summary.</span>
        </div>
      ) : null}
    </section>
  );
}
