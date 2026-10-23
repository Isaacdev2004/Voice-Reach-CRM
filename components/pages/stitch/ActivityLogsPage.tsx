"use client";
import { AiLauncherButton } from "@/components/ai/ai-launcher-button";
import { ConversationInbox } from "@/components/activity/conversation-inbox";
import { EditorialWorkspaceHero } from "@/components/layout/editorial-workspace-hero";
import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { DASHBOARD_PAGE_BODY } from "@/lib/dashboard/layout";
import type { ActivityLogEntry } from "@/lib/activity/types";
import {
  activityKpis,
  activityMatches,
  type ActivityScope,
} from "@/lib/activity/intelligence";
import { exportActivityCsv } from "@/lib/activity/storage";
import { inDateRange } from "@/lib/activity/format";
import { useDashboardSearch } from "@/lib/hooks/use-dashboard-search";
import "@/components/activity/activity-center.css";
const scopes: [ActivityScope, string, string][] = [
  ["all", "All Activity", "history"],
  ["conversations", "Conversations", "forum"],
  ["campaigns", "Campaigns", "send"],
  ["contacts", "Contacts", "person"],
  ["appointments", "Appointments & Tasks", "calendar_month"],
  ["alerts", "Alerts", "warning"],
];
export function ActivityLogsPage() {
  const { user } = useUser();
  return <ActivitySession key={user?.id || "signed-out"} />;
}
function ActivitySession() {
  const [inbox, setInbox] = useState(false);
  const { user } = useUser();
  const headerSearch = useDashboardSearch();
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [scope, setScope] = useState<ActivityScope>("all"),
    [system, setSystem] = useState(false),
    [query, setQuery] = useState(""),
    [range, setRange] = useState<"today" | "7d" | "30d" | "all">("30d");
  const [contact, setContact] = useState(""),
    [campaign, setCampaign] = useState(""),
    [type, setType] = useState(""),
    [status, setStatus] = useState("all"),
    [sort, setSort] = useState("newest"),
    [page, setPage] = useState(1);
  const [read, setRead] = useState<Set<string>>(new Set()),
    [dismissed, setDismissed] = useState<Set<string>>(new Set()),
    [stateAvailable, setStateAvailable] = useState(false);
  const [selected, setSelected] = useState<ActivityLogEntry | null>(null),
    [detailTab, setDetailTab] = useState("Details"),
    [notice, setNotice] = useState("");
  const [summary, setSummary] = useState<
      { title: string; href: string; detail?: string }[] | null
    >(null),
    [summarizing, setSummarizing] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/activity", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw Error();
      setEntries(j.entries ?? []);
      setRead(
        new Set(
          (j.state ?? [])
            .filter((s: { read: boolean }) => s.read)
            .map((s: { event_id: string }) => s.event_id),
        ),
      );
      setDismissed(
        new Set(
          (j.state ?? [])
            .filter((s: { dismissed: boolean }) => s.dismissed)
            .map((s: { event_id: string }) => s.event_id),
        ),
      );
      setStateAvailable(!!j.stateAvailable);
    } catch {
      setEntries([]);
      setSelected(null);
      setError("Activity could not be loaded. Please retry.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    setEntries([]);
    setSelected(null);
    setRead(new Set());
    setDismissed(new Set());
    void refresh();
  }, [user?.id, refresh]);
  useEffect(() => {
    if (headerSearch) setQuery(headerSearch);
  }, [headerSearch]);
  useEffect(
    () => setPage(1),
    [scope, system, query, range, contact, campaign, type, status, sort],
  );
  const saveRead = async (ids: string[], action = "read") => {
    if (!ids.length) return;
    try {
      for (let offset = 0; offset < ids.length; offset += 500) {
        const r = await fetch("/api/activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: ids.slice(offset, offset + 500),
            action,
          }),
        });
        if (!r.ok) throw Error();
      }
      setRead((s) => new Set([...s, ...ids]));
      if (action !== "read") setDismissed((s) => new Set([...s, ...ids]));
      setNotice("Activity status saved.");
    } catch {
      setNotice("Read status could not be saved. Please retry.");
    }
  };
  const business = entries.filter(
    (e) => e.category !== "system" && !dismissed.has(e.id),
  );
  const kpis = activityKpis(business);
  const filtered = useMemo(
    () =>
      entries
        .filter(
          (e) =>
            (system ? e.category === "system" : e.category !== "system") &&
            !dismissed.has(e.id) &&
            activityMatches(e, scope) &&
            inDateRange(e.createdAt, range) &&
            (!query ||
              `${e.title} ${e.body} ${e.action ?? ""}`
                .toLowerCase()
                .includes(query.toLowerCase())) &&
            (!contact ||
              e.metadata?.contactId === contact ||
              (e.entityType === "contact" && e.entityId === contact)) &&
            (!campaign ||
              e.metadata?.campaignId === campaign ||
              (e.entityType === "campaign" && e.entityId === campaign)) &&
            (!type || e.action === type) &&
            (status === "all" ||
              (status === "unread"
                ? !read.has(e.id)
                : status === "alerts"
                  ? !!e.alert
                  : read.has(e.id))),
        )
        .sort(
          (a, b) =>
            (sort === "newest" ? -1 : 1) *
            a.createdAt.localeCompare(b.createdAt),
        ),
    [
      entries,
      system,
      dismissed,
      scope,
      range,
      query,
      contact,
      campaign,
      type,
      status,
      sort,
      read,
    ],
  );
  const options = (kind: "contact" | "campaign") => [
    ...new Set(
      entries
        .map((e) =>
          String(
            e.metadata?.[`${kind}Id`] ??
              (e.entityType === kind ? e.entityId : ""),
          ),
        )
        .filter((x) => x && x !== "null"),
    ),
  ];
  const open = (e: ActivityLogEntry) => {
    setSelected(e);
    setDetailTab("Details");
    if (stateAvailable && !read.has(e.id)) void saveRead([e.id]);
  };
  const intelligence = async () => {
    setSummarizing(true);
    try {
      const r = await fetch("/api/activity/priorities");
      const j = await r.json();
      if (!r.ok) throw Error();
      const list = (j.items ?? j.priorities ?? []) as {
        title: string;
        href: string;
        detail?: string;
      }[];
      setSummary(list);
      setNotice(
        "Evidence-based daily priorities loaded. No tasks or messages were created.",
      );
    } catch {
      setNotice("Daily priorities could not be loaded. Please retry.");
    } finally {
      setSummarizing(false);
    }
  };
  const aiInsights = async () => {
    setSummarizing(true);
    try {
      const r = await fetch("/api/activity/insights", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw Error();
      setSummary(j.items ?? []);
      setNotice(
        "AI summary grounded in recent account audit records. Review the linked evidence; no actions were executed.",
      );
    } catch {
      setNotice(
        "AI activity insights are unavailable. Evidence-based daily priorities remain available.",
      );
    } finally {
      setSummarizing(false);
    }
  };
  return (
    <div className={`${DASHBOARD_PAGE_BODY} ac-center`}>
      <EditorialWorkspaceHero
        eyebrow="ACTIVITY LOGS"
        title="Every interaction tells a story."
        description="See the conversations, actions, and milestones shaping your business."
        image="/brand/heroes/activity-workspace.png"
        quote="Stay informed. Respond faster. Close more."
      />
      <section className="ac-kpis" aria-label="Activity summary">
        {[
          {
            label: "Interactions Today",
            value: kpis.today,
            icon: "chat_bubble",
            scope: "today",
            detail: "Business activity recorded today",
          },
          {
            label: "Client Replies",
            value: kpis.replies,
            icon: "group",
            scope: "replies",
            detail: "Recorded replies and callbacks",
          },
          {
            label: "Needs Attention",
            value: kpis.attention,
            icon: "error_outline",
            scope: "alerts",
            detail: "Recorded alerts requiring review",
          },
          {
            label: "Campaign Activity",
            value: kpis.campaigns,
            icon: "send",
            scope: "campaigns",
            detail: "Campaign and delivery events",
          },
        ].map((k) => (
          <button
            key={k.label}
            onClick={() => {
              setSystem(false);
              setScope(k.scope as ActivityScope);
              setRange("all");
              setQuery("");
              setContact("");
              setCampaign("");
              setType("");
              setStatus("all");
            }}
            className="ac-kpi"
          >
            <span className="ac-icon">
              <Icon name={k.icon} />
            </span>
            <span>
              <span>{k.label}</span>
              <strong>{loading ? "…" : error ? "—" : k.value}</strong>
              <small>{k.detail}</small>
            </span>
          </button>
        ))}
      </section>
      {inbox && <ConversationInbox />}
      <div className="ac-mode">
        <div role="tablist" aria-label="Activity workspace">
          <button
            role="tab"
            aria-selected={!system}
            onClick={() => {
              setSystem(false);
              setScope("all");
            }}
          >
            Business Activity
          </button>
          <button
            role="tab"
            aria-selected={system}
            onClick={() => {
              setSystem(true);
              setScope("all");
            }}
          >
            System & Audit Log
          </button>
        </div>
        <div className="ac-mode-actions">
          <button type="button" onClick={() => setInbox((v) => !v)}>
            {inbox ? "Back to activity" : "Open conversation inbox"}
          </button>
          <button
            type="button"
            disabled={summarizing}
            onClick={() => void aiInsights()}
          >
            AI Activity Insights
          </button>
          <AiLauncherButton label="Ask MyARI" />
          <button onClick={() => void intelligence()} disabled={summarizing}>
            <Icon name="auto_awesome" />
            {summarizing ? "Loading…" : "Daily priorities"}
          </button>
        </div>
      </div>
      {!system && (
        <nav className="ac-categories" aria-label="Activity categories">
          {scopes.map(([id, label, icon]) => (
            <button
              key={id}
              aria-pressed={scope === id}
              onClick={() => setScope(id)}
            >
              <Icon name={icon} />
              {label}{" "}
              <small>
                ({business.filter((e) => activityMatches(e, id)).length})
              </small>
            </button>
          ))}
        </nav>
      )}
      {notice && (
        <p role="status" className="ac-notice">
          {notice}
        </p>
      )}
      {error && (
        <div role="alert" className="ac-notice">
          {error}
          <button onClick={() => void refresh()}>Retry</button>
        </div>
      )}
      {summary && (
        <section className="ac-summary">
          <div className="ac-detail-heading">
            <h2>Daily priorities</h2>
            <button
              onClick={() => setSummary(null)}
              aria-label="Close daily priorities"
            >
              ×
            </button>
          </div>
          <p>Verified account records · suggestions require your review.</p>
          {summary.length ? (
            summary.map((s, i) => (
              <Link key={i} href={s.href || "/dashboard/tasks"}>
                {s.title}
                <small>{s.detail}</small>
              </Link>
            ))
          ) : (
            <p>No actionable priorities were returned for this view.</p>
          )}
        </section>
      )}
      <div className={`ac-workspace ${selected ? "ac-has-detail" : ""}`}>
        <section className="ac-feed">
          <div className="ac-toolbar">
            <label className="ac-search">
              <Icon name="search" />
              <input
                type="search"
                aria-label="Search activity logs"
                placeholder="Search activity logs…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Contact filter"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            >
              <option value="">All contacts</option>
              {options("contact").map((id) => (
                <option key={id} value={id}>
                  {entries.find((e) => e.entityId === id)?.title ||
                    `Contact ${id.slice(0, 8)}`}
                </option>
              ))}
            </select>
            <select
              aria-label="Campaign filter"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
            >
              <option value="">All campaigns</option>
              {options("campaign").map((id) => (
                <option key={id} value={id}>
                  {entries.find((e) => e.entityId === id)?.title ||
                    `Campaign ${id.slice(0, 8)}`}
                </option>
              ))}
            </select>
            <select
              aria-label="Activity type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">All activity types</option>
              {[...new Set(entries.map((e) => e.action).filter(Boolean))].map(
                (t) => (
                  <option key={t} value={t}>
                    {t?.replace(/_/g, " ")}
                  </option>
                ),
              )}
            </select>
            <select
              aria-label="Date range"
              value={range}
              onChange={(e) => setRange(e.target.value as typeof range)}
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
            <select
              aria-label="Read status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
              <option value="alerts">Needs attention</option>
            </select>
            <select
              aria-label="Sort activity"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <button
              disabled={!stateAvailable || !filtered.length}
              onClick={() => void saveRead(filtered.map((e) => e.id))}
            >
              <Icon name="done_all" />
              Mark all read
            </button>
            <button onClick={() => void refresh()} disabled={loading}>
              Refresh
            </button>
            <button
              disabled={!filtered.length}
              onClick={() =>
                exportActivityCsv(filtered, (d) => new Date(d).toISOString())
              }
            >
              Export CSV
            </button>
          </div>
          {!stateAvailable && !loading && (
            <p className="ac-note">
              Persistent read status requires the included Activity database
              migration.
            </p>
          )}
          <div className="ac-feed-heading">
            <strong>{filtered.length} matching events</strong>
            <button
              onClick={() => {
                setScope("all");
                setQuery("");
                setContact("");
                setCampaign("");
                setType("");
                setStatus("all");
                setRange("all");
              }}
            >
              Clear filters
            </button>
          </div>
          {loading ? (
            <p className="ac-empty">Loading your activity…</p>
          ) : !filtered.length ? (
            <div className="ac-empty">
              <Icon name="history" />
              <h2>A clearer view of your business.</h2>
              <p>No activity matches these filters. Try a wider date range.</p>
            </div>
          ) : (
            filtered.slice((page - 1) * 12, page * 12).map((e, i, rows) => {
              const date = new Date(e.createdAt).toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const previous = i
                ? new Date(rows[i - 1].createdAt).toLocaleDateString(
                    undefined,
                    {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    },
                  )
                : "";
              return (
                <div key={e.id}>
                  {date !== previous && <h3 className="ac-date">{date}</h3>}
                  <button
                    className="ac-row"
                    aria-pressed={selected?.id === e.id}
                    onClick={() => open(e)}
                  >
                    <span className={`ac-icon ${e.alert ? "ac-alert" : ""}`}>
                      <Icon name={e.icon} />
                    </span>
                    <span className="ac-row-copy">
                      <strong>
                        {e.title}
                        {!read.has(e.id) && stateAvailable && (
                          <i aria-label="Unread" />
                        )}
                      </strong>
                      <small>{e.body}</small>
                    </span>
                    <span className="ac-badge">
                      {e.alert ? "Needs attention" : e.category}
                    </span>
                    <time dateTime={e.createdAt}>
                      {new Date(e.createdAt).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                    <Icon name="chevron_right" />
                  </button>
                </div>
              );
            })
          )}
          <footer className="ac-pagination">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              Page {page} of {Math.max(1, Math.ceil(filtered.length / 12))}
            </span>
            <button
              disabled={page * 12 >= filtered.length}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </footer>
        </section>
        {selected && (
          <aside className="ac-detail" aria-label="Activity details">
            <div className="ac-detail-heading">
              <h2>{selected.title}</h2>
              <button
                aria-label="Close event details"
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            </div>
            <p>{new Date(selected.createdAt).toLocaleString()}</p>
            <nav>
              {["Details", "Context", "Actions"].map((t) => (
                <button
                  key={t}
                  aria-pressed={detailTab === t}
                  onClick={() => setDetailTab(t)}
                >
                  {t}
                </button>
              ))}
            </nav>
            {detailTab === "Details" ? (
              <>
                <div className="ac-event-body">{selected.body}</div>
                <dl>
                  {[
                    ["Category", selected.category],
                    ["Status", selected.metadata?.status],
                    ["Channel", selected.metadata?.channel],
                    ["Direction", selected.metadata?.direction],
                  ]
                    .filter(([, v]) => v)
                    .map(([label, v]) => (
                      <div key={String(label)}>
                        <dt>{String(label)}</dt>
                        <dd>{String(v)}</dd>
                      </div>
                    ))}
                </dl>
                <details>
                  <summary>Technical event reference</summary>
                  <p>{selected.action || selected.source}</p>
                  <code>{selected.id}</code>
                </details>
              </>
            ) : detailTab === "Context" ? (
              <>
                <p>Related records available for this event:</p>
                {selected.href ? (
                  <Link href={selected.href}>Open associated record →</Link>
                ) : (
                  <p>No associated record link is available.</p>
                )}
                <p>
                  Raw provider payloads and internal credentials are excluded
                  from this panel.
                </p>
              </>
            ) : (
              <div className="ac-detail-actions">
                {selected.href && (
                  <Link href={selected.href}>Open associated record →</Link>
                )}
                {!!(selected.entityType === "contact"
                  ? selected.entityId
                  : selected.metadata?.contactId) && (
                  <Link
                    href={`/dashboard/tasks?contactId=${encodeURIComponent(String(selected.entityType === "contact" ? selected.entityId : selected.metadata?.contactId))}&new=1`}
                  >
                    Create follow-up task
                  </Link>
                )}
                <Link href="/dashboard/calendar">Schedule callback</Link>
                <Link href="/dashboard/delivery">Open Delivery Audit</Link>
                <button
                  disabled={!stateAvailable}
                  onClick={() => void saveRead([selected.id])}
                >
                  Mark read
                </button>
                <button
                  disabled={!stateAvailable}
                  onClick={() => {
                    void saveRead([selected.id], "dismiss");
                    setSelected(null);
                  }}
                >
                  Dismiss from my feed
                </button>
              </div>
            )}
          </aside>
        )}
      </div>
      <p className="ac-note">
        Counts use the account records loaded by Activity and Delivery Audit.
        Interactions Today uses your browser’s local date; other KPI cards cover
        the loaded history. No trend is shown without historical evidence.
      </p>
    </div>
  );
}
