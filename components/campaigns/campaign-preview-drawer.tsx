"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { safeFetch } from "@/lib/api-response";
import {
  campaignStatus,
  isLibraryPreview,
  durationLabel,
  performanceSummary,
  recipientProgress,
  type LibraryCampaign,
  type LibraryPreview,
} from "@/lib/campaigns/library-data";
import { CampaignCover, type Cover } from "./campaign-library-card";
import { channelIcon } from "@/lib/campaigns/library-ui";
const TABS = ["Overview", "Sequence", "Contacts", "Performance"] as const;
const fmt = (value?: string | null) =>
  value && Number.isFinite(new Date(value).getTime())
    ? new Date(value).toLocaleString()
    : "Not recorded";
export function CampaignPreviewDrawer({
  campaign,
  cover,
  templatePreview,
  onClose,
  pinned,
  onPin,
  onDuplicate,
  onInstall,
  onChanged,
}: {
  campaign: LibraryCampaign;
  cover: Cover;
  templatePreview?: LibraryPreview;
  onClose: () => void;
  pinned: boolean;
  onPin: () => void;
  onDuplicate: (data: LibraryPreview) => Promise<void>;
  onInstall?: () => Promise<void>;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [data, setData] = useState<LibraryPreview | null>(
    templatePreview ?? null,
  );
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = "campaign-preview-title";
  useEffect(() => {
    if (templatePreview) return;
    const ctrl = new AbortController();
    setData(null);
    setError(false);
    void safeFetch<LibraryPreview>(`/api/campaigns/library/${campaign.id}`, {
      signal: AbortSignal.any([ctrl.signal, AbortSignal.timeout(15000)]),
    }).then((r) => {
      if (ctrl.signal.aborted) return;
      if (
        r.success &&
        isLibraryPreview(r.data) &&
        r.data.campaign.id === campaign.id &&
        Array.isArray(r.data.steps) &&
        Array.isArray(r.data.recipients) &&
        Array.isArray(r.data.runs) &&
        Array.isArray(r.data.engagement)
      )
        setData(r.data);
      else setError(true);
    });
    return () => ctrl.abort();
  }, [campaign.id, templatePreview, version]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab") {
        const nodes = Array.from(
          panel.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),a[href],input,select,summary,[tabindex="0"]',
          ) ?? [],
        ).filter((el) => el.getClientRects().length);
        const first = nodes[0],
          last = nodes.at(-1);
        if (!first) return;
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === panel.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === panel.current)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus({ preventScroll: true });
    };
  }, [onClose]);
  const action = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setActionError("");
    try {
      await fn();
    } catch {
      setActionError("This action could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }, []);
  const live =
    data?.campaign.provider &&
    data.campaign.provider !== "mock" &&
    typeof data.campaign.live_launched === "boolean" &&
    ["sending", "queued"].includes(data.campaign.status);
  const toggleLive = async () => {
    if (!data) return;
    await action(async () => {
      const res = await safeFetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveLaunched: !data.campaign.live_launched }),
      });
      if (!res.success) throw Error();
      setConfirm(false);
      setVersion((v) => v + 1);
      onChanged();
    });
  };
  const metric = data ? performanceSummary(data) : null;
  return createPortal(
    <div className="cl-drawer-layer">
      <button
        className="cl-drawer-shade"
        aria-label="Close campaign preview"
        onClick={onClose}
      />
      <div
        ref={panel}
        tabIndex={-1}
        className="cl-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="cl-drawer-header">
          <div>
            <p className="cl-eyebrow">CAMPAIGN PREVIEW</p>
            <h2 id={titleId}>{campaign.name}</h2>
          </div>
          <button
            className="cl-icon-button"
            aria-label="Close preview"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </header>
        <div
          role="tablist"
          aria-label="Campaign preview tabs"
          className="cl-preview-tabs"
        >
          {TABS.map((label, i) => (
            <button
              role="tab"
              id={`campaign-tab-${label}`}
              aria-controls={`campaign-panel-${label}`}
              aria-selected={tab === label}
              tabIndex={tab === label ? 0 : -1}
              key={label}
              onClick={() => setTab(label)}
              onKeyDown={(e) => {
                if (
                  ["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)
                ) {
                  e.preventDefault();
                  const next =
                    e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? 3
                        : (i + (e.key === "ArrowRight" ? 1 : 3)) % 4;
                  setTab(TABS[next]);
                  document
                    .getElementById(`campaign-tab-${TABS[next]}`)
                    ?.focus();
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          className="cl-drawer-body"
          role="tabpanel"
          id={`campaign-panel-${tab}`}
          aria-labelledby={`campaign-tab-${tab}`}
          tabIndex={0}
        >
          {error ? (
            <div className="cl-empty" role="alert">
              <h3>Preview unavailable</h3>
              <p>Please try again. Your campaign has not changed.</p>
              <button
                className="cl-button"
                onClick={() => setVersion((v) => v + 1)}
              >
                Retry preview
              </button>
            </div>
          ) : !data ? (
            <p role="status">Loading campaign preview…</p>
          ) : (
            <>
              {tab === "Overview" ? (
                <>
                  <CampaignCover cover={cover} className="cl-preview-cover" />
                  <p className="cl-badge">
                    {templatePreview
                      ? "Template"
                      : campaignStatus(data.campaign)}
                  </p>
                  <p>
                    {data.campaign.description ||
                      "A description is not available for this campaign."}
                  </p>
                  <dl className="cl-overview-stats">
                    <div>
                      <dt>Duration</dt>
                      <dd>{durationLabel(data.campaign.durationMinutes)}</dd>
                    </div>
                    <div>
                      <dt>Steps</dt>
                      <dd>{data.steps.length}</dd>
                    </div>
                    <div>
                      <dt>Enrolled contacts</dt>
                      <dd>
                        {templatePreview
                          ? "Not enrolled"
                          : data.campaign.enrollmentCount}
                      </dd>
                    </div>
                    <div>
                      <dt>Owner</dt>
                      <dd>
                        {data.campaign.owner_name ||
                          (templatePreview
                            ? "MyARI template"
                            : "Your workspace")}
                      </dd>
                    </div>
                  </dl>
                  <div className="cl-channels">
                    {data.campaign.channels.map((ch) => (
                      <span key={ch}>
                        <Icon name={channelIcon(ch)} />
                        {ch}
                      </span>
                    ))}
                  </div>
                  <button
                    className="cl-button"
                    onClick={() => setTab("Contacts")}
                  >
                    View contacts <Icon name="arrow_forward" />
                  </button>
                </>
              ) : null}
              {tab === "Sequence" ? (
                data.steps.length ? (
                  <ol className="cl-timeline">
                    {data.steps.map((s, i) => (
                      <li key={s.id}>
                        <span className="cl-step-icon">
                          <Icon name={channelIcon(s.type)} />
                        </span>
                        <div>
                          <p className="cl-eyebrow">
                            STEP {i + 1} · {s.type}
                          </p>
                          <h3>{s.title}</h3>
                          <p className="cl-muted">
                            {s.delay_minutes === 0
                              ? "At enrollment"
                              : `${durationLabel(s.delay_minutes)} after enrollment`}
                            {s.day_label ? ` · ${s.day_label}` : ""}
                            {s.time_label ? ` · ${s.time_label}` : ""}
                          </p>
                          <details>
                            <summary>Message preview</summary>
                            <div className="cl-message">
                              {s.description ||
                                "No message content saved for this step."}
                            </div>
                          </details>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="cl-empty">
                    <h3>No sequence steps yet</h3>
                    <p>Open the editor to build this campaign.</p>
                  </div>
                )
              ) : null}
              {tab === "Contacts" ? (
                data.recipients.length ? (
                  <ul className="cl-recipient-list">
                    {data.recipients.map((r) => {
                      const progress = recipientProgress(r, data);
                      return (
                        <li key={r.id}>
                          <div>
                            {r.contact ? (
                              <Link
                                href={`/dashboard/contacts/${r.contact.id}`}
                              >
                                {[r.contact.first_name, r.contact.last_name]
                                  .filter(Boolean)
                                  .join(" ") ||
                                  r.contact.email ||
                                  "Open contact"}
                              </Link>
                            ) : (
                              <strong>Contact unavailable</strong>
                            )}
                            <p>{r.contact?.email || r.contact?.phone || ""}</p>
                          </div>
                          <span className="cl-badge">
                            {r.delivery_status} · {r.eligibility_status}
                          </span>
                          <p>Current step: {progress.step}</p>
                          <p>Last activity: {fmt(progress.last)}</p>
                          <p>Next action: {fmt(progress.next)}</p>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="cl-empty">
                    <Icon name="group" />
                    <h3>No contacts enrolled</h3>
                    <p>
                      {templatePreview
                        ? "Install this playbook, then select eligible contacts."
                        : "Add eligible contacts from the full campaign when you are ready."}
                    </p>
                  </div>
                )
              ) : null}
              {tab === "Performance" ? (
                templatePreview ? (
                  <div className="cl-empty">
                    <h3>A fresh start</h3>
                    <p>
                      Performance becomes available after you enroll contacts
                      and run your campaign.
                    </p>
                  </div>
                ) : (
                  <>
                    <h3>Recorded campaign activity</h3>
                    <p className="cl-muted">
                      Metrics count unique logical messages from delivery
                      evidence. Queued, accepted and simulated messages are not
                      confirmed delivery.
                    </p>
                    <dl className="cl-performance">
                      {(
                        [
                          "sent",
                          "delivered",
                          "opened",
                          "replied",
                          "completed",
                        ] as const
                      ).map((key) => (
                        <div key={key}>
                          <dt>
                            {key === "completed" ? "Executed sequences" : key}
                          </dt>
                          <dd>
                            {!data.performanceAvailable &&
                            key !== "sent" &&
                            key !== "completed"
                              ? "Unavailable"
                              : (metric?.[key] ?? "—")}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    {!data.performanceAvailable ? (
                      <p role="status">
                        Provider delivery evidence is not available for this
                        campaign.
                      </p>
                    ) : !data.engagement.length ? (
                      <p>No engagement events recorded yet.</p>
                    ) : null}
                    <p className="cl-muted">
                      Executed sequences have a worker-processed run for every
                      step. This does not prove delivery.{" "}
                      {data.campaign.provider === "mock"
                        ? "This campaign uses simulation."
                        : ""}
                    </p>
                  </>
                )
              ) : null}
            </>
          )}
          {actionError ? (
            <p className="cl-error" role="alert">
              {actionError}
            </p>
          ) : null}
          {confirm ? (
            <div className="cl-confirm" role="alert">
              <h3>
                {data?.campaign.live_launched
                  ? "Pause live delivery?"
                  : "Resume live delivery?"}
              </h3>
              <p>
                {data?.campaign.live_launched
                  ? "Queued steps will remain scheduled but live delivery will stop."
                  : "This can resume scheduled outbound messages. Confirm only when you are ready."}
              </p>
              <button
                className="cl-button"
                disabled={busy}
                onClick={() => void toggleLive()}
              >
                Confirm {data?.campaign.live_launched ? "pause" : "resume"}
              </button>
              <button
                className="cl-button"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Cancel
              </button>
            </div>
          ) : null}
        </div>
        <footer className="cl-drawer-actions">
          {templatePreview ? (
            <button
              className="cl-button cl-primary"
              disabled={busy}
              onClick={() =>
                void action(async () => {
                  await onInstall?.();
                })
              }
            >
              Install as draft
            </button>
          ) : (
            <>
              <Link
                className="cl-button cl-primary"
                href={`/dashboard/campaigns/${campaign.id}`}
              >
                Open full campaign
              </Link>
              <Link
                className="cl-button"
                href={`/dashboard/campaigns?edit=${campaign.id}#campaign-builder`}
              >
                Edit
              </Link>
              <Link className="cl-button" href={`/dashboard/tasks?new=task&campaignId=${campaign.id}`}>Create follow-up task</Link>
              <button
                className="cl-button"
                disabled={busy || !data?.steps.length}
                onClick={() => data && void action(() => onDuplicate(data))}
              >
                Duplicate
              </button>
              <button
                className="cl-button"
                aria-pressed={pinned}
                onClick={onPin}
              >
                {pinned ? "Unpin" : "Pin"}
              </button>
              {live ? (
                <button
                  className="cl-button"
                  disabled={busy}
                  onClick={() => setConfirm(true)}
                >
                  {data?.campaign.live_launched ? "Pause" : "Resume"}
                </button>
              ) : null}
            </>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
