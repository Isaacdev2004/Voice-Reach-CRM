"use client";
import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { conciergeRequest } from "./workspace";
import type { CaseRecord } from "@/lib/concierge/schema";
import "./concierge.css";
type StaffData = {
  role: string;
  analytics?: {
    discoveryCompleted: number;
    importsCompleted: number;
    firstDraftPrepared: number;
    campaignReviewed: number;
    trainingCompleted: number;
    meanMinutesToFirstDraft: number | null;
    denominatorLabel: string;
  };
  cases: (CaseRecord & {
    readiness?: { percent: number; completed: number; total: number };
    subscription?: { plan: string; status: string };
  })[];
  metrics: {
    scopedCases: number;
    needsAttention: number;
    byStage: Record<string, number>;
    coverage: string;
  };
  communicationDrafts: { day: number; subject: string; copy: string }[];
};
export function ConciergeStaff() {
  const {user,isLoaded}=useUser();
  return isLoaded&&user ? <StaffWorkspace key={user.id}/> : <div className="concierge"><p role="status">Sign in to your authorized staff account.</p></div>;
}
function StaffWorkspace() {
  const [data, setData] = useState<StaffData | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [filter, setFilter] = useState(""),
    [busy, setBusy] = useState(false);
  const reload = useCallback(async () => {
    setData(await conciergeRequest("/api/concierge/staff"));
  }, []);
  useEffect(() => {
    void reload().catch((e) => setError(e.message));
  }, [reload]);
  async function save(c: CaseRecord, form: HTMLFormElement) {
    if (busy) return;
    const f = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await conciergeRequest("/api/concierge/staff", {
        owner: c.owner_id,
        requestId: crypto.randomUUID(),
        version: c.version,
        stage: f.get("stage"),
        internalNote: f.get("internalNote"),
        nextFollowup: f.get("nextFollowup") || null,
        ...(data?.role === "admin" || data?.role === "manager"
          ? { assignee: f.get("assignee") || null }
          : {}),
      });
      await reload();
      setNotice("Case updated and recorded in its action history.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="concierge">
      <header className="concierge-welcome">
        <div>
          <span className="concierge-eyebrow">
            Personal service. Thoughtful oversight.
          </span>
          <h1>Concierge Command Center</h1>
          <p>
            Your authorized onboarding cases. No contact lists, subscriber notes
            or provider credentials are exposed here.
          </p>
        </div>
        <button
          disabled={busy}
          onClick={() => void reload().catch((e) => setError(e.message))}
        >
          Refresh cases
        </button>
      </header>
      {error && (
        <p role="alert" className="concierge-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="concierge-notice">
          {notice}
        </p>
      )}
      {!data ? (
        <p role="status">Loading your authorized cases…</p>
      ) : (
        <>
          <section className="concierge-card">
            <div className="concierge-metrics">
              <div>
                <strong>{data.metrics.scopedCases}</strong>Cases in scope
              </div>
              <div>
                <strong>{data.metrics.needsAttention}</strong>No update in seven
                days
              </div>
              <div>
                <strong>{data.metrics.byStage.ready ?? 0}</strong>Marked ready
                by staff
              </div>
            </div>
            {data.analytics && (
              <details>
                <summary>Measured onboarding outcomes</summary>
                <p>{data.analytics.denominatorLabel}</p>
                <p>
                  Discovery complete: {data.analytics.discoveryCompleted} ·
                  Imports completed: {data.analytics.importsCompleted} · First
                  drafts: {data.analytics.firstDraftPrepared} · Campaign
                  reviews: {data.analytics.campaignReviewed} · Training
                  complete: {data.analytics.trainingCompleted}
                </p>
                <p>
                  Mean time to first draft:{" "}
                  {data.analytics.meanMinutesToFirstDraft === null
                    ? "No recorded first-draft timing yet"
                    : `${data.analytics.meanMinutesToFirstDraft} minutes`}
                  . Registration conversion, billing conversion, first live
                  launch and support-resolution metrics remain unavailable until
                  their actual event sources are linked.
                </p>
              </details>
            )}
            <p>
              {data.metrics.coverage} Staff stage is not an automatic completion
              or launch approval.
            </p>
            <label>
              Search authorized cases
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Case reference or stage"
              />
            </label>
          </section>
          {data.cases
            .filter((c) =>
              `${c.owner_id} ${c.stage}`
                .toLowerCase()
                .includes(filter.toLowerCase()),
            )
            .map((c) => (
              <section className="concierge-card" key={c.owner_id}>
                <div className="concierge-staff-row">
                  <div>
                    <span className="concierge-eyebrow">
                      {c.stage.replaceAll("_", " ")}
                    </span>
                    <h2>
                      {data.role === "sales"
                        ? "Authorized onboarding status"
                        : c.discovery.agentName || "New onboarding case"}
                    </h2>
                    <p>
                      Private case reference: <code>{c.owner_id}</code>
                    </p>
                    <p>
                      Last updated {new Date(c.updated_at).toLocaleString()}
                    </p>
                    <p>Next follow-up: {c.next_followup ?? "Not scheduled"}</p>
                    {data.role !== "sales" && (
                      <>
                        <p>
                          {c.readiness
                            ? `${c.readiness.completed} / ${c.readiness.total} milestones (${c.readiness.percent}%)`
                            : "Completion verification pending"}{" "}
                          · {c.subscription?.plan ?? "Plan unverified"} ·{" "}
                          {c.subscription?.status ?? "Status unverified"}
                        </p>
                        <p>
                          Market: {c.discovery.market || "Discovery pending"} ·{" "}
                          {c.discovery.specialty}
                        </p>
                        <p>Goals: {c.discovery.goals || "Not provided"}</p>
                        <p>
                          Assigned specialist:{" "}
                          <code>{c.assignee_id || "Unassigned"}</code>
                        </p>
                        <p>
                          Training appointments and last-contact verification
                          are managed manually with the existing authorized
                          calendar and activity workflows; no appointment,
                          invitation or communication is sent from this screen.
                        </p>
                      </>
                    )}
                  </div>
                  {data.role !== "sales" && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void save(c, e.currentTarget);
                      }}
                    >
                      <label>
                        Stage
                        <select name="stage" defaultValue={c.stage}>
                          {[
                            "discovery",
                            "migration",
                            "campaigns",
                            "review",
                            "training",
                            "ready",
                            "needs_attention",
                          ].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                      {["admin", "manager"].includes(data.role) && (
                        <label>
                          Assign authorized staff user ID
                          <input
                            name="assignee"
                            defaultValue={c.assignee_id ?? ""}
                          />
                        </label>
                      )}
                      <label>
                        Next follow-up date
                        <input
                          type="date"
                          name="nextFollowup"
                          defaultValue={c.next_followup ?? ""}
                        />
                      </label>
                      <label>
                        Internal implementation notes
                        <textarea
                          name="internalNote"
                          maxLength={3000}
                          defaultValue={c.internal_note}
                          placeholder="Operational notes only. Never enter credentials or unnecessary client details."
                        />
                      </label>
                      <button disabled={busy} className="concierge-primary">
                        {busy ? "Saving…" : "Save case update"}
                      </button>
                    </form>
                  )}
                </div>
              </section>
            ))}
          {data.cases.length === 0 && (
            <section className="concierge-card">
              <h2>No cases in your authorized scope.</h2>
              <p>
                Subscribers must start Concierge first. Specialists and sales
                partners see only assigned cases.
              </p>
            </section>
          )}
          {data.role !== "sales" && (
            <section className="concierge-card">
              <h2>Onboarding communication drafts</h2>
              <p>
                Review these milestone-based suggestions with the subscriber’s
                actual progress. Delivery is not automated, and consent alone is
                not send approval.
              </p>
              {data.communicationDrafts.map((d) => (
                <details key={d.day}>
                  <summary>
                    Day {d.day} · {d.subject}
                  </summary>
                  <p>{d.copy}</p>
                </details>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
