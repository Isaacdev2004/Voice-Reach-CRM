"use client";

import { ActivityDetailModal } from "@/components/activity/activity-detail-modal";
import { activityRowClass, toneIconClass, toneTitleClass } from "@/components/activity/activity-tone";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { formatRelativeTime, inDateRange } from "@/lib/activity/format";
import type { ActivityCategory, ActivityFilterState, ActivityLogEntry } from "@/lib/activity/types";
import { useDashboardSearch } from "@/lib/hooks/use-dashboard-search";
import {
  acknowledgeOnServer,
  exportActivityCsv,
  fetchActivityLogs,
  loadDismissedIds,
  loadReadIds,
  markDismissed,
  markRead,
} from "@/lib/activity/storage";
import { useCallback, useEffect, useMemo, useState } from "react";

type Toast = { message: string; tone: "success" | "error" };

const PAGE_SIZE = 12;

const CATEGORY_OPTIONS: { value: ActivityCategory; label: string }[] = [
  { value: "all", label: "All events" },
  { value: "engagement", label: "Engagement" },
  { value: "campaigns", label: "Campaigns" },
  { value: "contacts", label: "Contacts" },
  { value: "voice", label: "Voice studio" },
  { value: "automation", label: "Automations" },
  { value: "compliance", label: "Compliance" },
  { value: "system", label: "System" },
];

const RANGE_OPTIONS: { value: ActivityFilterState["range"]; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

export function ActivityLogsPage() {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<ActivityFilterState>({
    category: "all",
    query: "",
    range: "30d",
    showDismissed: false,
  });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<ActivityLogEntry | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [exporting, setExporting] = useState(false);

  const showToast = (message: string, tone: Toast["tone"] = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4000);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { entries: remote } = await fetchActivityLogs();
      setEntries(remote);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load activity");
    } finally {
      setLoading(false);
    }
  }, []);

  const headerQuery = useDashboardSearch();

  useEffect(() => {
    setReadIds(loadReadIds());
    setDismissedIds(loadDismissedIds());
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (headerQuery) {
      setFilters((f) => ({ ...f, query: headerQuery }));
      setVisibleCount(PAGE_SIZE);
    }
  }, [headerQuery]);

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return entries
      .filter((e) => (filters.showDismissed ? true : !dismissedIds.has(e.id)))
      .filter((e) => filters.category === "all" || e.category === filters.category)
      .filter((e) => inDateRange(e.createdAt, filters.range))
      .filter(
        (e) =>
          !q ||
          e.title.toLowerCase().includes(q) ||
          e.body.toLowerCase().includes(q) ||
          e.action?.toLowerCase().includes(q),
      );
  }, [entries, filters, dismissedIds]);

  const visible = filtered.slice(0, visibleCount);

  const stats = useMemo(() => {
    const today = entries.filter((e) => inDateRange(e.createdAt, "today") && !dismissedIds.has(e.id));
    const alerts = entries.filter((e) => e.alert && !dismissedIds.has(e.id) && !readIds.has(e.id));
    const unread = entries.filter((e) => !readIds.has(e.id) && !dismissedIds.has(e.id));
    return {
      today: today.length,
      alerts: alerts.length,
      unread: unread.length,
      total: entries.filter((e) => !dismissedIds.has(e.id)).length,
    };
  }, [entries, readIds, dismissedIds]);

  const handleMarkRead = (id: string) => {
    markRead([id]);
    setReadIds(loadReadIds());
    showToast("Marked as read");
  };

  const handleMarkAllRead = () => {
    const ids = filtered.map((e) => e.id);
    markRead(ids);
    setReadIds(loadReadIds());
    showToast(`${ids.length} items marked as read`);
  };

  const handleDismiss = (id: string) => {
    markDismissed([id]);
    setDismissedIds(loadDismissedIds());
    setDetailOpen(false);
    showToast("Removed from feed");
  };

  const handleAcknowledge = async (id: string) => {
    markRead([id]);
    markDismissed([id]);
    setReadIds(loadReadIds());
    setDismissedIds(loadDismissedIds());
    try {
      await acknowledgeOnServer([id], "acknowledge");
    } catch {
      /* local state is enough */
    }
    setDetailOpen(false);
    showToast("Alert acknowledged");
  };

  const openDetail = (entry: ActivityLogEntry) => {
    setSelected(entry);
    setDetailOpen(true);
    if (!readIds.has(entry.id)) {
      markRead([entry.id]);
      setReadIds(loadReadIds());
    }
  };

  const handleExport = () => {
    setExporting(true);
    try {
      exportActivityCsv(filtered, formatRelativeTime);
      showToast(`Exported ${filtered.length} log entries`);
    } catch {
      showToast("Export failed", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="luxury-page mx-auto w-full max-w-[1400px] space-y-6 p-8">
      {toast ? (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-[150] flex max-w-sm items-center gap-2 rounded-xl border px-4 py-3 shadow-card",
            toast.tone === "success" ? "border-emerald-muted/30 bg-ivory" : "border-error/30",
          )}
          role="status"
        >
          <Icon
            name={toast.tone === "success" ? "check_circle" : "error"}
            className={toast.tone === "success" ? "text-emerald-muted" : "text-error"}
          />
          <span className="text-[14px] text-ink">{toast.message}</span>
        </div>
      ) : null}

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
            Activity
          </p>
          <h1 className="font-serif text-[36px] font-semibold text-ink">Activity logs</h1>
          <p className="mt-1 text-[15px] text-slate-text">
            Audit trail of campaigns, compliance events, engagement, and system actions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="flex h-11 items-center gap-2 rounded-full border border-outline-variant/30 bg-ivory px-5 text-[14px] font-medium text-ink transition-colors hover:bg-champagne disabled:opacity-50"
          >
            <Icon name="refresh" className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={filtered.length === 0}
            className="flex h-11 items-center gap-2 rounded-full border border-outline-variant/30 bg-ivory px-5 text-[14px] font-medium text-ink transition-colors hover:bg-champagne disabled:opacity-50"
          >
            <Icon name="done_all" />
            Mark all read
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || filtered.length === 0}
            className="flex h-11 items-center gap-2 rounded-full bg-rose-gold px-5 text-[14px] font-medium text-ivory shadow-sm transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            <Icon name="download" />
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </header>

      {loadError ? (
        <p className="rounded-2xl border border-error/20 bg-error/5 px-4 py-3 text-[14px] text-error">
          {loadError} — showing cached or demo entries when available.
        </p>
      ) : null}

      {stats.alerts > 0 ? (
        <LuxuryCard padding="md" className="border-error/20 bg-error/[0.03]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
                <Icon name="gavel" />
              </div>
              <div>
                <p className="font-medium text-ink">
                  {stats.alerts} compliance alert{stats.alerts === 1 ? "" : "s"} need attention
                </p>
                <p className="text-[14px] text-slate-text">
                  Review consent and delivery issues before your next send.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setFilters((f) => ({ ...f, category: "compliance", showDismissed: false }))
              }
              className="shrink-0 rounded-full bg-error/10 px-4 py-2 text-[13px] font-medium text-error"
            >
              View alerts
            </button>
          </div>
        </LuxuryCard>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total events", value: loading ? "…" : stats.total, icon: "history" },
          { label: "Today", value: loading ? "…" : stats.today, icon: "today" },
          { label: "Unread", value: loading ? "…" : stats.unread, icon: "mark_email_unread" },
          { label: "Open alerts", value: loading ? "…" : stats.alerts, icon: "warning" },
        ].map((stat) => (
          <LuxuryCard key={stat.label} padding="md">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-taupe">{stat.label}</p>
              <Icon name={stat.icon} className="text-[20px] text-rose-gold-deep/70" />
            </div>
            <p className="mt-1 font-serif text-[28px] font-semibold text-ink">{stat.value}</p>
          </LuxuryCard>
        ))}
      </div>

      <LuxuryCard padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-outline-variant/10 p-5 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="font-serif text-[22px] font-semibold text-ink">Recent activity</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-taupe"
              />
              <input
                type="search"
                value={filters.query}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, query: e.target.value }));
                  setVisibleCount(PAGE_SIZE);
                }}
                placeholder="Search logs…"
                className="h-10 w-full rounded-full border border-outline-variant/20 bg-champagne/50 pl-10 pr-4 text-[14px] outline-none focus:border-rose-gold-deep/40"
                aria-label="Search activity logs"
              />
            </div>
            <select
              value={filters.category}
              onChange={(e) => {
                setFilters((f) => ({
                  ...f,
                  category: e.target.value as ActivityCategory,
                }));
                setVisibleCount(PAGE_SIZE);
              }}
              className="h-10 rounded-full border border-outline-variant/20 bg-ivory px-4 text-[14px] outline-none"
              aria-label="Filter by category"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={filters.range}
              onChange={(e) => {
                setFilters((f) => ({
                  ...f,
                  range: e.target.value as ActivityFilterState["range"],
                }));
                setVisibleCount(PAGE_SIZE);
              }}
              className="h-10 rounded-full border border-outline-variant/20 bg-ivory px-4 text-[14px] outline-none"
              aria-label="Filter by date"
            >
              {RANGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <label className="flex cursor-pointer items-center gap-2 px-2 text-[13px] text-taupe">
              <input
                type="checkbox"
                checked={filters.showDismissed}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, showDismissed: e.target.checked }))
                }
                className="rounded border-outline-variant"
              />
              Show dismissed
            </label>
          </div>
        </div>

        {loading ? (
          <p className="p-12 text-center text-taupe">Loading activity…</p>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center">
            <Icon name="inbox" className="mx-auto text-[40px] text-taupe/50" />
            <p className="mt-3 font-medium text-ink">No activity matches your filters</p>
            <p className="mt-1 text-[14px] text-slate-text">
              Try a wider date range or clear search.
            </p>
            <button
              type="button"
              onClick={() => {
                setFilters({
                  category: "all",
                  query: "",
                  range: "all",
                  showDismissed: false,
                });
                setVisibleCount(PAGE_SIZE);
              }}
              className="mt-4 text-[14px] font-medium text-rose-gold-deep hover:underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {visible.map((item) => {
              const unread = !readIds.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openDetail(item)}
                  className={cn("w-full text-left", activityRowClass(item.alert, unread))}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneIconClass(item.tone)}`}
                  >
                    <Icon name={item.icon} className="text-[20px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span
                        className={cn(
                          "text-[14px] font-semibold",
                          toneTitleClass(item.tone, item.alert),
                        )}
                      >
                        {item.title}
                        {unread ? (
                          <span className="ml-2 inline-block h-2 w-2 rounded-full bg-rose-gold-deep align-middle" />
                        ) : null}
                      </span>
                      <span className="shrink-0 text-[12px] text-taupe">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[14px] text-slate-text">{item.body}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-champagne px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-taupe">
                        {item.category}
                      </span>
                      {item.source !== "audit" ? (
                        <span className="text-[11px] text-taupe capitalize">{item.source}</span>
                      ) : null}
                      {item.href ? (
                        <span className="text-[12px] font-medium text-rose-gold-deep">
                          View details →
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Icon name="chevron_right" className="shrink-0 self-center text-taupe" />
                </button>
              );
            })}
          </div>
        )}

        {!loading && filtered.length > visibleCount ? (
          <div className="border-t border-outline-variant/10 p-4 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              className="rounded-full border border-outline-variant/25 px-6 py-2 text-[14px] font-medium text-ink hover:bg-champagne"
            >
              Load more ({filtered.length - visibleCount} remaining)
            </button>
          </div>
        ) : null}
      </LuxuryCard>

      <p className="text-center text-[13px] text-taupe">
        Events sync from your account actions — contacts, campaigns, voice, and automations.
      </p>

      <ActivityDetailModal
        entry={selected}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onMarkRead={handleMarkRead}
        onDismiss={handleDismiss}
        onAcknowledge={handleAcknowledge}
        isRead={selected ? readIds.has(selected.id) : true}
      />
    </div>
  );
}
