"use client";
import { AiUsagePanel } from "@/components/billing/ai-usage";
import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ActionPreview } from "./preview";
import type { Proposal } from "@/lib/assistant/schema";
export function CommandCenter() {
  const { user } = useUser();
  return user ? (
    <OwnedCommandCenter key={user.id} owner={user.id} />
  ) : (
    <p>Sign in to review assistant work.</p>
  );
}
function OwnedCommandCenter({ owner }: { owner: string }) {
  const [work, setWork] = useState<
      {
        proposal: Proposal;
        status: string;
        at: string;
        outcome?: {
          state: string;
          delivery?: { state: string; message: string; href: string };
          result?: { href?: string; message?: string };
          message?: string;
        };
      }[]
    >([]),
    [error, setError] = useState(""),
    [filter, setFilter] = useState("All"),
    [query, setQuery] = useState("");
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/assistant/work", {
          headers: { "X-MyARI-Owner": owner },
        }),
        data = await r.json();
      if (!r.ok) throw Error(data.error);
      setWork(data.work);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Work could not be loaded");
    }
  }, [owner]);
  useEffect(() => {
    void load();
    let remaining = 12;
    const timer = setInterval(() => {
      if (--remaining < 0) {
        clearInterval(timer);
        return;
      }
      if (document.visibilityState !== "hidden") void load();
    }, 10000);
    return () => clearInterval(timer);
  }, [load]);
  return (
    <section className="assistant-command-center">
      <details>
        <summary>AI allowance &amp; billing</summary>
        <AiUsagePanel />
      </details>
      <header>
        <p className="text-xs uppercase tracking-widest">MyARI Assistant</p>
        <h1 className="font-serif text-4xl">
          Your work, thoughtfully organized.
        </h1>
        <p>
          Drafts, approvals and confirmed results. Nothing sends or activates
          automatically.
        </p>
        <button
          onClick={() =>
            window.dispatchEvent(new Event("myari-assistant-open"))
          }
        >
          Open assistant
        </button>
        <button onClick={() => void load()}>Refresh results</button>
      </header>
      <div className="assistant-actions">
        <label>
          Search work
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label>
          Status
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {[
              "All",
              "In Progress",
              "Awaiting Approval",
              "Completed",
              "Needs Attention",
              "Cancelled",
              "Superseded",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      {work
        .filter(
          (w) =>
            (filter === "All" || w.status === filter) &&
            JSON.stringify(w.proposal.action)
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .map((w) => (
          <section key={w.proposal.id}>
            <h2 className="font-serif text-xl">
              {w.status} · {new Date(w.at).toLocaleString()}
            </h2>
            {w.outcome ? (
              <p>
                {w.outcome.delivery?.message ??
                  w.outcome.result?.message ??
                  w.outcome.message}
                {w.outcome.result?.href && (
                  <>
                    {" "}
                    <a href={w.outcome.result.href}>Open record</a>
                  </>
                )}
              </p>
            ) : (
              <ActionPreview
                proposal={w.proposal}
                owner={owner}
                onUpdated={() => void load()}
              />
            )}
          </section>
        ))}
      {!work.length && !error && (
        <p>No assistant work is recorded for this account yet.</p>
      )}
      <p>
        Safe recovery checks stored outcomes. Actions with uncertain results are
        never automatically retried.
      </p>
    </section>
  );
}
