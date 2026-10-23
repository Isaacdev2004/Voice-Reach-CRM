"use client";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useAiAssistant } from "@/components/ai/ai-assistant-context";
import { Modal } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import {
  Preferences,
  categories,
  categoryLabels,
  type BriefingPreferences,
  type Snapshot,
} from "@/lib/dashboard/briefing/model";
import type { CachedBriefing } from "@/lib/dashboard/briefing/service";
type State = {
  schedulerConfigured?: boolean;
  preferences: BriefingPreferences;
  version: string | null;
  snapshot: Snapshot;
  cached: CachedBriefing | null;
  output: { bullets: string[] };
};
export function DashboardBriefing() {
  const { user } = useUser();
  return <OwnerBriefing key={user?.id ?? "signed-out"} owner={user?.id} />;
}
function OwnerBriefing({ owner }: { owner?: string }) {
  const { openAssistant } = useAiAssistant();
  const [data, setData] = useState<State | null>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(Preferences.parse({}));
  const [busy, setBusy] = useState(false);
  const live = useRef(true),
    visited = useRef(false);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  useEffect(() => {
    if (!owner) return;
    const ac = new AbortController();
    setError("");
    void fetch("/api/dashboard/briefing", {
      cache: "no-store",
      signal: AbortSignal.any([ac.signal, AbortSignal.timeout(30000)]),
      headers: { "X-MyARI-Owner": owner },
    })
      .then(async (r) => {
        const j = await r.json();
        if (
          !r.ok ||
          j.success !== true ||
          !Preferences.safeParse(j.preferences).success ||
          !Array.isArray(j.snapshot?.items)
        )
          throw Error();
        if (ac.signal.aborted) return;
        setData(j);
        if (!visited.current) {
          visited.current = true;
          void fetch("/api/dashboard/briefing", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-MyARI-Owner": owner,
            },
            body: JSON.stringify({ action: "visit" }),
            signal: ac.signal,
          }).catch(() => undefined);
        }
      })
      .catch(() => {
        if (!ac.signal.aborted)
          setError("Priorities could not be verified. Please retry.");
      });
    return () => ac.abort();
  }, [owner, version]);
  async function save(next: BriefingPreferences) {
    if (!data || busy || !owner) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/dashboard/briefing/preferences", {
        method: "PUT",
        signal: AbortSignal.timeout(30000),
        headers: { "Content-Type": "application/json", "X-MyARI-Owner": owner },
        body: JSON.stringify({ preferences: next, version: data.version }),
      });
      const j = await r.json();
      if (
        !r.ok ||
        j.success !== true ||
        !Preferences.safeParse(j.preferences).success ||
        typeof j.version !== "string"
      )
        throw Error(
          j.code === "quiet_hours"
            ? "Choose a briefing time outside workspace quiet hours."
            : r.status === 409
              ? "Preferences changed in another session. Refresh before saving."
              : "Preferences could not be saved. Please retry.",
        );
      if (!live.current) return;
      setData((old) =>
        old ? { ...old, preferences: j.preferences, version: j.version } : old,
      );
      setEditing(false);
      setVersion((v) => v + 1);
    } catch (e) {
      if (live.current)
        setError(
          e instanceof Error ? e.message : "Preferences could not be saved.",
        );
    } finally {
      if (live.current) setBusy(false);
    }
  }
  if (data && !data.preferences.show && !editing)
    return (
      <div className="dashboard-briefing-hidden">
        <button
          onClick={() => {
            setDraft(data.preferences);
            setEditing(true);
          }}
        >
          Morning briefing preferences
        </button>
      </div>
    );
  const prefs = data?.preferences;
  const items =
    data?.snapshot.items
      .filter(
        (i) =>
          !prefs?.dismissed.includes(i.id) &&
          (expanded ||
            ["tasks", "appointments", "replies", "calls"].includes(i.category)),
      )
      .slice(
        0,
        expanded ? (prefs?.limit ?? 4) : Math.min(prefs?.limit ?? 3, 3),
      ) ?? [];
  return (
    <section
      id="morning-briefing"
      className={`dashboard-briefing ${expanded ? "is-expanded" : "is-preview"} ${prefs?.layout === "comfortable" ? "is-comfortable" : ""}`}
      aria-labelledby="morning-briefing-heading"
    >
      <header>
        <div>
          <h2 id="morning-briefing-heading">
            <span aria-hidden="true">
              <Icon name="wb_sunny" />
            </span>
            AI Morning Briefing
          </h2>
          <p>
            Your business at a glance. Priorities, conversations, and follow-ups
            in one place.
          </p>
        </div>
        <div className="dashboard-briefing-controls">
          <button
            onClick={() =>
              openAssistant({
                task: "daily_briefing",
                context: { tone: "luxury" },
                brief: "Summarize my verified daily priorities.",
              })
            }
          >
            Ask MyARI briefing <Icon name="auto_awesome" />
          </button>
          <button
            disabled={!data || busy}
            onClick={() => {
              setDraft(data!.preferences);
              setEditing(true);
            }}
            aria-label="Briefing preferences"
          >
            <Icon name="tune" />
          </button>
          <button
            disabled={busy}
            onClick={() => setVersion((v) => v + 1)}
            aria-label="Refresh priorities"
          >
            <Icon name="refresh" />
          </button>
          {prefs && (
            <button
              disabled={busy}
              aria-expanded={!prefs.collapsed}
              aria-label={
                prefs.collapsed ? "Expand priorities" : "Collapse priorities"
              }
              onClick={() =>
                void save({ ...prefs, collapsed: !prefs.collapsed })
              }
            >
              <Icon name={prefs.collapsed ? "expand_more" : "expand_less"} />
            </button>
          )}
        </div>
      </header>
      {error && (
        <p className="dashboard-briefing-error" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p role="status">Loading verified priorities…</p>}
      {data && !prefs?.collapsed && (
        <>
          {data.cached && (
            <p className="dashboard-briefing-ready">
              Daily briefing ready ·{" "}
              {data.cached.provider === "claude"
                ? "AI-assisted focus, verified facts"
                : "Verified-record summary"}{" "}
              ·{" "}
              <button
                onClick={() =>
                  openAssistant({
                    task: "daily_briefing",
                    context: { tone: "luxury" },
                  })
                }
              >
                Review with Ask MyARI →
              </button>
            </p>
          )}
          {!items.length ? (
            <p className="dashboard-briefing-empty">
              No matching priorities in the available records.{" "}
              <Link href="/dashboard/tasks">Review tasks →</Link>
            </p>
          ) : (
            <ol className="dashboard-priority-list">
              {items.map((i, index) => (
                <li key={i.id}>
                  <span className="dashboard-priority-icon">
                    <Icon
                      name={
                        i.category === "tasks"
                          ? "checklist"
                          : i.category === "appointments"
                            ? "event"
                            : i.category === "calls"
                              ? "phone_missed"
                              : i.category === "replies"
                                ? "chat_bubble"
                                : "flag"
                      }
                    />
                  </span>
                  <div className="dashboard-priority-copy">
                    <Link href={i.href}>{i.title}</Link>
                    {i.contactName && (
                      <p className="dashboard-priority-contact">
                        {i.contactName} ·{" "}
                        {new Date(i.at).toLocaleDateString("en-US", {
                          timeZone: prefs?.timezone,
                          month: "short",
                          day: "numeric",
                        })}
                        {i.category === "appointments"
                          ? ` · ${new Date(i.at).toLocaleTimeString("en-US", { timeZone: prefs?.timezone, hour: "numeric", minute: "2-digit" })}`
                          : ""}
                      </p>
                    )}
                    {expanded && <p>{i.reason}</p>}
                    <details className="dashboard-priority-actions">
                      <summary>Actions</summary>
                      <div>
                        {i.contactId && (
                          <>
                            <Link href={`/dashboard/contacts/${i.contactId}`}>
                              Open contact
                            </Link>
                            <Link
                              href={`/dashboard/tasks?new=task&contactId=${i.contactId}${i.campaignId ? `&campaignId=${i.campaignId}` : ""}`}
                            >
                              Prepare task
                            </Link>
                            <Link
                              href={`/dashboard/calendar?new=event&kind=callback&contactId=${i.contactId}`}
                            >
                              Schedule callback
                            </Link>
                          </>
                        )}
                        {i.category === "replies" && i.contactId && (
                          <button
                            onClick={() =>
                              openAssistant({
                                task: "sms_writer",
                                context: {
                                  contactId: i.contactId,
                                  tone: "luxury",
                                  goal: "Prepare a reply for my review; do not assume the client's intentions.",
                                },
                              })
                            }
                          >
                            Draft reply
                          </button>
                        )}
                        {i.campaignId && (
                          <Link href={`/dashboard/campaigns/${i.campaignId}`}>
                            Review campaign
                          </Link>
                        )}
                      </div>
                    </details>
                  </div>
                  <div className="dashboard-priority-adjust">
                    <button
                      disabled={busy || index === 0}
                      aria-label={`Move ${i.title} up`}
                      onClick={() => {
                        const order = data.snapshot.items.map((v) => v.id);
                        const at = order.indexOf(i.id);
                        [order[at - 1], order[at]] = [order[at], order[at - 1]];
                        void save({
                          ...data.preferences,
                          order: order.slice(0, 100),
                        });
                      }}
                    >
                      <Icon name="arrow_upward" />
                    </button>
                    <button
                      disabled={busy}
                      aria-label={`Dismiss ${i.title}`}
                      onClick={() =>
                        void save({
                          ...data.preferences,
                          dismissed: [
                            ...data.preferences.dismissed,
                            i.id,
                          ].slice(-100),
                        })
                      }
                    >
                      <Icon name="close" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <div className="dashboard-briefing-footer">
            <button type="button" onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Show compact briefing" : "View full briefing"}{" "}
              <span aria-hidden="true">→</span>
            </button>
            {data && (
              <span>
                Updated{" "}
                {new Date(data.snapshot.updatedAt).toLocaleTimeString("en-US", {
                  timeZone: prefs?.timezone,
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
          {expanded && (
            <details className="dashboard-briefing-method">
              <summary>How priorities are selected · data coverage</summary>
              <p>
                Manual order first, then overdue deadlines, today&apos;s
                commitments, recorded lead replies, upcoming closings and
                verified delivery failures. Suggestions do not predict business
                outcomes. Review every proposed action before saving or sending.
              </p>
              {data.snapshot.limitations.map((s) => (
                <p key={s}>{s}</p>
              ))}
              {data.cached?.limitation && <p>{data.cached.limitation}</p>}
            </details>
          )}
        </>
      )}
      <Modal
        open={editing}
        onClose={() => {
          if (!busy) setEditing(false);
        }}
        title="Morning briefing preferences"
        size="lg"
      >
        <form
          className="dashboard-briefing-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save(draft);
          }}
        >
          <label>
            <input
              type="checkbox"
              checked={draft.show}
              onChange={(e) => setDraft({ ...draft, show: e.target.checked })}
            />
            Show on dashboard
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) =>
                setDraft({ ...draft, enabled: e.target.checked })
              }
            />
            Enable scheduled daily briefing
          </label>
          <div>
            <label>
              Preferred time
              <input
                type="time"
                value={draft.time}
                onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                required
              />
            </label>
            <label>
              Timezone
              <input
                value={draft.timezone}
                onChange={(e) =>
                  setDraft({ ...draft, timezone: e.target.value })
                }
                placeholder="America/New_York"
                required
              />
            </label>
          </div>
          <p>
            Every 15 minutes after your preferred time, subject to workspace
            quiet hours.{" "}
            {data?.schedulerConfigured
              ? "The background worker credential is configured."
              : "Background worker configuration is unverified or unavailable; scheduled delivery may remain pending."}
          </p>
          <label>
            <input
              type="checkbox"
              checked={draft.weekdaysOnly}
              onChange={(e) =>
                setDraft({ ...draft, weekdaysOnly: e.target.checked })
              }
            />
            Weekdays only
          </label>
          <div>
            <label>
              Delivery
              <select
                value={draft.delivery}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    delivery: e.target.value as BriefingPreferences["delivery"],
                  })
                }
              >
                <option value="dashboard">Dashboard only</option>
                <option value="in_app">
                  Dashboard and in-app notification
                </option>
              </select>
            </label>
            <label>
              Visible priorities
              <input
                type="number"
                min="1"
                max="10"
                value={draft.limit}
                onChange={(e) =>
                  setDraft({ ...draft, limit: Number(e.target.value) })
                }
                required
              />
            </label>
          </div>
          <fieldset>
            <legend>Included categories</legend>
            {categories.map((c) => (
              <label key={c}>
                <input
                  type="checkbox"
                  checked={draft.categories.includes(c)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      categories: e.target.checked
                        ? [...draft.categories, c]
                        : draft.categories.filter((v) => v !== c),
                    })
                  }
                />
                {categoryLabels[c]}
              </label>
            ))}
          </fieldset>
          <label>
            Layout
            <select
              value={draft.layout}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  layout: e.target.value as BriefingPreferences["layout"],
                })
              }
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.collapsed}
              onChange={(e) =>
                setDraft({ ...draft, collapsed: e.target.checked })
              }
            />
            Collapse priorities
          </label>
          <button
            type="button"
            onClick={() => setDraft({ ...draft, dismissed: [], order: [] })}
          >
            Restore dismissed items and default order
          </button>
          {error && <p role="alert">{error}</p>}
          <div>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !Preferences.safeParse(draft).success}
            >
              {busy ? "Saving…" : "Save preferences"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
