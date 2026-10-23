"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import type { ChannelHealth, MessageRecord } from "@/lib/delivery/types";
import type { summarizeDelivery } from "@/lib/delivery/metrics";
import "./delivery-audit.css";
type Row = Omit<MessageRecord, "body" | "subject" | "events">;
type Snapshot = {
  records: Row[];
  page: number;
  pages: number;
  total: number;
  metrics: ReturnType<typeof summarizeDelivery>;
  health: ChannelHealth[];
  coverage: string;
  canReconcile?: boolean;
  options: {
    campaigns: { id: string; name: string }[];
    contacts: { id: string; name: string }[];
  };
};
type Detail = {
  record: MessageRecord;
  attempts: {
    id: string;
    status: string;
    created_at: string;
    provider_message_id: string | null;
  }[];
  health: ChannelHealth;
};
const fmt = (value: string | null) =>
  value
    ? new Date(value).toLocaleString(undefined, { timeZone: "UTC" }) + " UTC"
    : "Not recorded";
export function DeliveryAuditPage() {
  const { user } = useUser();
  return <DeliveryWorkspace key={user?.id ?? "signed-out"} />;
}
function DeliveryWorkspace() {
  const [syncBusy, setSyncBusy] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState("");
  const reconcile = async (channel: string) => {
    if (
      !window.confirm(
        "Read this provider's pending message statuses and record new evidence? No messages will be sent or retried.",
      )
    )
      return;
    setSyncBusy(channel);
    setSyncNotice("");
    try {
      const res = await fetch("/api/delivery/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, confirmReadOnly: true }),
      });
      if (!res.ok) throw Error();
      const result = await res.json();
      setSyncNotice(
        result.errorCode
          ? "Provider status checks could not complete. Review this channel's health."
          : `${result.checked} provider records checked. No messages were sent.`,
      );
      setReload((n) => n + 1);
    } catch {
      setSyncNotice(
        "Provider status checks are unavailable. No resend was attempted.",
      );
    } finally {
      setSyncBusy(null);
    }
  };
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [data, setData] = useState<Snapshot | null>(null),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(true),
    [reload, setReload] = useState(0),
    [selected, setSelected] = useState<string | null>(null);
  const set = (key: string, value: string) =>
    setFilters((f) => {
      const next = { ...f, [key]: value, page: "1" };
      if (!value) delete next[key];
      return next;
    });
  useEffect(() => {
    const ctrl = new AbortController();
    setBusy(true);
    setError(false);
    setData(null);
    const params = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => !!v),
    );
    for (const key of ["from", "to"])
      if (params.get(key)) {
        const day = params.get(key)!;
        const date = new Date(`${day}T00:00:00Z`);
        if (key === "to") date.setUTCDate(date.getUTCDate() + 1);
        params.set(key, date.toISOString());
      }
    const timer = setTimeout(() => {
      void fetch(`/api/delivery?${params}`, {
        signal: ctrl.signal,
        cache: "no-store",
      })
        .then(async (res) => {
          if (!res.ok) throw Error();
          const json = await res.json();
          if (!Array.isArray(json.records) || !Array.isArray(json.health))
            throw Error();
          setData(json);
        })
        .catch(() => {
          if (!ctrl.signal.aborted) setError(true);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setBusy(false);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [filters, reload]);
  return (
    <main className="da-workspace">
      <header className="da-header">
        <div>
          <span className="da-eyebrow">DELIVERY AUDIT</span>
          <h1>Clarity in every connection.</h1>
          <p>
            Message-level evidence, confirmed delivery, and independent channel
            health.
          </p>
        </div>
        <div className="da-actions">
          <Link href="/dashboard/campaigns">Campaigns</Link>
          <Link href="/dashboard/analytics">Analytics</Link>
          <button onClick={() => setReload((n) => n + 1)} disabled={busy}>
            Refresh evidence
          </button>
        </div>
      </header>
      <p className="da-notice">
        No messages are sent from this page. Times and date filters use UTC. A
        refresh reads MyARI records; it does not synchronize with providers.
      </p>
      {syncNotice ? (
        <p role="status" className="da-notice">
          {syncNotice}
        </p>
      ) : null}
      {error ? (
        <section role="alert" className="da-panel">
          <h2>Delivery evidence unavailable</h2>
          <p>
            Tracking may need configuration or a connection check. Historical
            delivery has not been verified.
          </p>
          <button onClick={() => setReload((n) => n + 1)}>Try again</button>
        </section>
      ) : null}
      {busy ? (
        <p role="status" className="da-panel">
          Loading delivery evidence…
        </p>
      ) : null}
      {data ? (
        <>
          <section aria-label="Provider Health" className="da-health">
            <h2>Provider Health</h2>
            <p>
              Credentials indicate configuration only. Webhook activity is
              separate from reconciliation.
            </p>
            <div className="da-health-grid">
              {data.health.map((h) => (
                <article className="da-panel" key={h.channel}>
                  <div className="da-health-title">
                    <h3>
                      {h.channel === "sms"
                        ? "SMS"
                        : h.channel === "email"
                          ? "Email"
                          : "Ringless voicemail"}
                    </h3>
                    <span className="da-badge">{h.status}</span>
                  </div>
                  <p>
                    {h.provider} · {h.mode}
                  </p>
                  <dl>
                    <dt>Last successful sync</dt>
                    <dd>{fmt(h.lastSuccessfulSync)}</dd>
                    <dt>Last attempted sync</dt>
                    <dd>{fmt(h.lastAttemptedSync)}</dd>
                    <dt>Most recent webhook</dt>
                    <dd>{fmt(h.latestWebhook)}</dd>
                    <dt>Pending updates</dt>
                    <dd>{h.pendingUpdates}</dd>
                    <dt>Delivery confirmations</dt>
                    <dd>
                      {h.confirmationSupported
                        ? "Supported by callback mapping; production verification pending"
                        : "Unavailable"}
                    </dd>
                  </dl>
                  {data.canReconcile && h.channel !== "voicemail" ? (
                    <button
                      disabled={!!syncBusy}
                      onClick={() => void reconcile(h.channel)}
                    >
                      {syncBusy === h.channel
                        ? "Checking provider…"
                        : "Check provider statuses"}
                    </button>
                  ) : (
                    <p className="da-notice">
                      {h.channel === "voicemail"
                        ? "Reconciliation API unavailable; authenticated webhooks only."
                        : "Manual reconciliation awaits configuration and approval."}
                    </p>
                  )}
                  {h.syncError ? <p role="status">{h.syncError}</p> : null}
                </article>
              ))}
            </div>
          </section>
          <section className="da-metrics" aria-label="Matching delivery totals">
            {[
              ["Unique messages", data.metrics.messages],
              ["Submission attempts", data.metrics.attempts],
              ["Distinct contacts", data.metrics.recipients],
              ["Confirmed delivered", data.metrics.delivered],
              ["Failed", data.metrics.failed],
              ["Pending confirmation", data.metrics.pending],
            ].map(([label, value]) => (
              <div className="da-panel" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </section>
        </>
      ) : null}
      <section className="da-panel">
        <div className="da-toolbar">
          <label>
            Search
            <input
              type="search"
              placeholder="Contact, campaign, or step"
              value={filters.q ?? ""}
              onChange={(e) => set("q", e.target.value)}
            />
          </label>
          <Select
            label="Campaign"
            value={filters.campaign}
            onChange={(v) => set("campaign", v)}
            options={data?.options.campaigns ?? []}
          />
          <Select
            label="Contact"
            value={filters.contact}
            onChange={(v) => set("contact", v)}
            options={data?.options.contacts ?? []}
          />
          <Select
            label="Channel"
            value={filters.channel}
            onChange={(v) => set("channel", v)}
            options={["sms", "email", "voicemail"].map((id) => ({
              id,
              name: id,
            }))}
          />
          <Select
            label="Status"
            value={filters.status}
            onChange={(v) => set("status", v)}
            options={[
              "pending",
              "queued",
              "submitted",
              "accepted",
              "sent",
              "delivered",
              "failed",
              "undelivered",
              "bounced",
              "rejected",
              "unknown",
            ].map((id) => ({ id, name: id }))}
          />
          <label>
            From (UTC)
            <input
              type="date"
              value={filters.from ?? ""}
              onChange={(e) => set("from", e.target.value)}
            />
          </label>
          <label>
            Through (UTC)
            <input
              type="date"
              value={filters.to ?? ""}
              onChange={(e) => set("to", e.target.value)}
            />
          </label>
          <Select
            label="Sort"
            value={filters.sort ?? "created"}
            onChange={(v) => set("sort", v)}
            options={[
              { id: "created", name: "Submission time" },
              { id: "sent", name: "Sent time" },
              { id: "delivered", name: "Delivery time" },
              { id: "contact", name: "Contact" },
              { id: "status", name: "Status" },
            ]}
          />
          <Select
            label="Direction"
            value={filters.direction ?? "desc"}
            onChange={(v) => set("direction", v)}
            options={[
              { id: "desc", name: "Descending" },
              { id: "asc", name: "Ascending" },
            ]}
          />
          <button onClick={() => setFilters({})}>Clear all</button>
        </div>
        <p className="da-notice">
          {data?.coverage ??
            "Only recorded evidence is shown. Legacy recipient rollups are not delivery receipts."}
        </p>
        {data && !data.records.length ? (
          <div className="da-empty">
            <Icon name="fact_check" />
            <h2>No matching delivery evidence</h2>
            <p>
              Try another filter. Earlier campaign activity is not automatically
              treated as confirmed delivery.
            </p>
          </div>
        ) : null}
        {data?.records.length ? (
          <div className="da-table-wrap">
            <table>
              <thead>
                <tr>
                  {[
                    "Contact / Campaign",
                    "Sequence step",
                    "Channel",
                    "Delivery status",
                    "Sent",
                    "Confirmed delivery",
                    "Failure / Last sync",
                    "Details",
                  ].map((s) => (
                    <th key={s}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.records.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.contact}</strong>
                      <span>{r.campaign}</span>
                    </td>
                    <td>{r.step}</td>
                    <td>{r.channel}</td>
                    <td>
                      <span
                        className={`da-badge ${r.failure ? "da-failed" : ""}`}
                      >
                        {r.indicator}
                      </span>
                      <small>{r.status}</small>
                    </td>
                    <td>{fmt(r.sentAt)}</td>
                    <td>{fmt(r.deliveredAt)}</td>
                    <td>
                      {r.failure?.explanation ?? "—"}
                      <small>{fmt(r.lastSyncAt)}</small>
                    </td>
                    <td>
                      <button
                        aria-label={`View delivery details for ${r.contact}`}
                        onClick={() => setSelected(r.id)}
                      >
                        View <span aria-hidden>→</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {data ? (
          <nav aria-label="Delivery pagination" className="da-pagination">
            <span>
              {data.total} attempts · Page {data.page} of {data.pages}
            </span>
            <button
              disabled={data.page <= 1 || busy}
              onClick={() =>
                setFilters((f) => ({ ...f, page: String(data.page - 1) }))
              }
            >
              Previous
            </button>
            <button
              disabled={data.page >= data.pages || busy}
              onClick={() =>
                setFilters((f) => ({ ...f, page: String(data.page + 1) }))
              }
            >
              Next
            </button>
          </nav>
        ) : null}
      </section>
      {selected ? (
        <MessageDrawer id={selected} onClose={() => setSelected(null)} />
      ) : null}
    </main>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
}) {
  return (
    <label>
      {label}
      <select
        aria-label={label}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {!["Sort", "Direction"].includes(label) ? (
          <option value="">All</option>
        ) : null}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
function MessageDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [data, setData] = useState<Detail | null>(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const close = useCallback(() => onClose(), [onClose]);
  useEffect(() => {
    const ctrl = new AbortController();
    setData(null);
    setError(false);
    void fetch(`/api/delivery?id=${encodeURIComponent(id)}`, {
      signal: ctrl.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw Error();
        const value = await res.json();
        if (!value.record || !Array.isArray(value.record.events)) throw Error();
        setData(value);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setError(true);
      });
    return () => ctrl.abort();
  }, [id, retry]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const nodes = panel.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === panel.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [close]);
  const r = data?.record;
  return (
    <div className="da-overlay">
      <button
        className="da-backdrop"
        aria-label="Close message details"
        onClick={onClose}
      />
      <aside
        className="da-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-detail-title"
        tabIndex={-1}
        ref={panel}
      >
        <header>
          <span className="da-eyebrow">MESSAGE EVIDENCE</span>
          <button onClick={onClose} aria-label="Close delivery details">
            ×
          </button>
          <h2 id="delivery-detail-title">Delivery details</h2>
        </header>
        {error ? (
          <div role="alert">
            <p>Message evidence could not be loaded.</p>
            <button onClick={() => setRetry((n) => n + 1)}>Try again</button>
          </div>
        ) : !r ? (
          <p role="status">Loading message…</p>
        ) : (
          <>
            <h3>{r.contact}</h3>
            <p>
              {r.campaign} · {r.step} · {r.channel}
            </p>
            <span className="da-badge">{r.indicator}</span>
            <dl>
              <dt>Provider reference</dt>
              <dd>{r.provider_message_id ?? "Not returned"}</dd>
              <dt>Submission recorded</dt>
              <dd>{fmt(r.submittedAt)}</dd>
              <dt>Provider-confirmed sent</dt>
              <dd>{fmt(r.sentAt)}</dd>
              <dt>Confirmed delivery</dt>
              <dd>{fmt(r.deliveredAt)}</dd>
              <dt>Last webhook received</dt>
              <dd>{fmt(r.lastWebhookAt)}</dd>
              <dt>Last reconciliation sync</dt>
              <dd>{fmt(r.lastSyncAt)}</dd>
              <dt>Channel health</dt>
              <dd>{data?.health.status ?? "Status Unavailable"}</dd>
            </dl>
            <section>
              <h3>Actual submitted message</h3>
              {r.subject ? <strong>{r.subject}</strong> : null}
              <p className="da-body">
                {r.body ||
                  "Text was not recorded. Recorded voicemail audio is not represented by a text transcript."}
              </p>
            </section>
            {r.failure ? (
              <section className="da-error">
                <h3>{r.failure.explanation}</h3>
                <p>{r.failure.guidance}</p>
                <p>
                  No automatic resend is available. A resend requires explicit
                  authorization and renewed compliance checks.
                </p>
              </section>
            ) : null}
            <section>
              <h3>Verified event timeline</h3>
              {r.events.length ? (
                <ol className="da-timeline">
                  {r.events.map((e) => (
                    <li key={e.id}>
                      <strong>{e.event_type}</strong>
                      <span>
                        {e.source} ·{" "}
                        {e.occurred_at
                          ? `Provider time: ${fmt(e.occurred_at)}`
                          : "Provider event time unavailable"}
                      </span>
                      <small>Recorded {fmt(e.received_at)}</small>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>No verified events recorded.</p>
              )}
            </section>
            <section>
              <h3>Submission / retry history</h3>
              <p>
                Attempts are shown separately from unique messages. No retry is
                initiated here.
              </p>
              {data?.attempts.map((a) => (
                <p key={a.id}>
                  {fmt(a.created_at)} · {a.status} ·{" "}
                  {a.provider_message_id ?? "Reference unavailable"}
                </p>
              ))}
            </section>
            <div className="da-actions">
              {r.contact_id ? (
                <Link href={`/dashboard/contacts/${r.contact_id}`}>
                  Open contact
                </Link>
              ) : null}
              {r.campaign_id && /^[\da-f-]{36}$/i.test(r.campaign_id) ? (
                <Link href={`/dashboard/campaigns/${r.campaign_id}`}>
                  Open campaign
                </Link>
              ) : null}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
