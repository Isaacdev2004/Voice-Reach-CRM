"use client";
import { PreviewDetails } from "./preview-details";
import { useEffect, useState } from "react";
import type { Proposal } from "@/lib/assistant/schema";
type Outcome = {
  state: string;
  message?: string;
  result?: { href?: string; message?: string };
};
export function ActionPreview({
  proposal,
  owner,
  onUpdated,
}: {
  proposal: Proposal;
  owner: string;
  onUpdated: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(JSON.stringify(proposal.action, null, 2)),
    [replacement, setReplacement] = useState<Proposal | null>(null),
    [checked, setChecked] = useState(false),
    [outcome, setOutcome] = useState<Outcome | null>(null);
  const p = replacement ?? proposal;
  const parsedDraft = (() => {
    try {
      const value = JSON.parse(draft);
      return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  })();
  useEffect(() => {
    let live = true;
    fetch(`/api/assistant/proposals?id=${p.id}`, {
      headers: { "X-MyARI-Owner": owner },
    })
      .then(async (r) => {
        const d = await r.json();
        if (live && r.ok && d.outcome) setOutcome(d.outcome);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [p.id, owner]);
  async function mutate(mode: "save" | "cancel" | "edit" | "check") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        mode === "edit"
          ? "/api/assistant/proposals"
          : mode === "check"
            ? `/api/assistant/proposals?id=${p.id}`
            : "/api/assistant/approve",
        {
          method:
            mode === "edit"
              ? "POST"
              : mode === "check"
                ? "GET"
                : mode === "cancel"
                  ? "DELETE"
                  : "POST",
          headers: {
            "Content-Type": "application/json",
            "X-MyARI-Owner": owner,
          },
          ...(mode === "check"
            ? {}
            : {
                body: JSON.stringify(
                  mode === "edit"
                    ? { action: JSON.parse(draft), revisionOf: p.id }
                    : mode === "cancel"
                      ? { proposalId: p.id }
                      : {
                          proposalId: p.id,
                          digest: p.digest,
                          confirmation: ["sms", "email"].includes(p.action.kind)
                            ? "CONFIRM_SEND"
                            : "CONFIRM_SAVE",
                        },
                ),
              }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw Error(data.error ?? "Action could not be confirmed");
      if (mode === "edit") {
        setReplacement(data.proposal);
        setEditing(false);
        setChecked(false);
      } else setOutcome(data.outcome ?? null);
      onUpdated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to confirm");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="assistant-preview">
      <header>
        <strong>
          {p.action.kind.replaceAll("_", " ")} · {outcome?.state ?? "Proposed"}
        </strong>
        <span>Expires {new Date(p.expiresAt).toLocaleTimeString()}</span>
      </header>
      <p>
        {p.executable
          ? ["sms", "email"].includes(p.action.kind)
            ? "Expected result: submit one exact message to the displayed recipient. Provider fees may apply."
            : "Expected result: save one separate CRM record. No communications or activation."
          : p.limitation}
      </p>
      <PreviewDetails proposal={p} />
      <p>
        External recipients and potential costs are shown in the exact preview.
        No activation, enrollment, deletion, billing changes or automatic
        sharing.
      </p>
      {p.action.kind === "financing" && (
        <div className="assistant-actions">
          <a href={`/api/assistant/document?id=${p.id}&format=pdf`}>
            Download estimate PDF
          </a>
          <a href={`/api/assistant/document?id=${p.id}&format=png`}>
            Download estimate image
          </a>
        </div>
      )}
      {p.action.kind === "flyer" && (
        <div className="assistant-actions">
          <a
            href={`/api/assistant/flyer?id=${p.id}&format=png`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Preview image
          </a>
          <a href={`/api/assistant/flyer?id=${p.id}&format=pdf`}>
            Download PDF
          </a>
          <a href={`/api/assistant/flyer?id=${p.id}&format=svg`}>
            Editable SVG
          </a>
          <a href={`/api/assistant/flyer?id=${p.id}&format=json`}>
            Editable source
          </a>
        </div>
      )}
      {editing && (
        <div>
          <p>Edit draft</p>
          {p.action.kind === "flyer" && (
            <div>
              <label>
                Layout
                <select
                  value={String(parsedDraft.layout ?? "editorial")}
                  onChange={(e) =>
                    setDraft(
                      JSON.stringify(
                        { ...parsedDraft, layout: e.target.value },
                        null,
                        2,
                      ),
                    )
                  }
                >
                  <option value="editorial">Editorial</option>
                  <option value="minimal">Minimal</option>
                </select>
              </label>
              <label>
                Accent color
                <input
                  type="color"
                  value={String(parsedDraft.accentColor ?? "#A77B58")}
                  onChange={(e) =>
                    setDraft(
                      JSON.stringify(
                        { ...parsedDraft, accentColor: e.target.value },
                        null,
                        2,
                      ),
                    )
                  }
                />
              </label>
              <p>
                Approved imagery is managed through Brand Kit. Property photos
                require an authorized listing-photo workflow; no photo is
                invented.
              </p>
            </div>
          )}
          {Object.entries(parsedDraft)
            .filter(
              ([key, value]) =>
                [
                  "title",
                  "body",
                  "script",
                  "subject",
                  "headline",
                  "description",
                  "audience",
                  "name",
                  "price",
                  "durationDays",
                  "notes",
                  "recommendation",
                  "reason",
                ].includes(key) && ["string", "number"].includes(typeof value),
            )
            .map(([key, value]) => (
              <label key={key}>
                {key.replaceAll("_", " ")}
                <textarea
                  aria-label={`Edit ${key}`}
                  value={String(value)}
                  onChange={(e) => {
                    const next = JSON.parse(draft);
                    next[key] =
                      typeof value === "number"
                        ? Number(e.target.value)
                        : e.target.value;
                    setDraft(JSON.stringify(next, null, 2));
                  }}
                  rows={
                    ["body", "script", "description", "notes"].includes(key)
                      ? 4
                      : 1
                  }
                />
              </label>
            ))}
          <details>
            <summary>Advanced structured fields</summary>
            <textarea
              aria-label="Edit action details"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={10}
            />
          </details>
          <button disabled={busy} onClick={() => void mutate("edit")}>
            Prepare edited preview
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {outcome && (
        <p role="status">
          {outcome.result?.message ?? outcome.message ?? outcome.state}
          {outcome.result?.href && (
            <>
              {" "}
              <a href={outcome.result.href}>Open created record</a>
            </>
          )}
        </p>
      )}
      {!outcome && (
        <>
          <div className="assistant-actions">
            <button
              disabled={busy}
              onClick={() => {
                setDraft(JSON.stringify(p.action, null, 2));
                setEditing(!editing);
              }}
            >
              Edit
            </button>
            <button disabled={busy} onClick={() => void mutate("cancel")}>
              Cancel proposal
            </button>
            <button disabled={busy} onClick={() => void mutate("check")}>
              Check saved result
            </button>
          </div>
          {p.executable && (
            <>
              <label className="assistant-confirm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                />
                I reviewed the exact target, content, effects and costs and
                explicitly approve this action.
              </label>
              <button
                className="assistant-primary"
                disabled={busy || !checked}
                onClick={() => void mutate("save")}
              >
                {busy
                  ? "Confirming…"
                  : ["sms", "email"].includes(p.action.kind)
                    ? "Approve & send this message"
                    : "Approve & save"}
              </button>
            </>
          )}
        </>
      )}
    </article>
  );
}
