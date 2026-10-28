"use client";
import { PreviewDetails } from "./preview-details";
import { useEffect, useState } from "react";
import type { Proposal } from "@/lib/assistant/schema";
type Outcome = {
  delivery?: { state: string; message: string; href: string };
  state: string;
  message?: string;
  result?: { href?: string; message?: string };
};
export function ActionPreview({
  proposal,
  owner,
  onUpdated,
  allowSending = true,
}: {
  proposal: Proposal;
  owner: string;
  onUpdated: () => void;
  allowSending?: boolean;
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
  const outcomeState = outcome?.state,
    deliveryState = outcome?.delivery?.state;
  useEffect(() => {
    if (
      !["completed", "needs_review", "in_progress"].includes(
        outcomeState ?? "",
      ) ||
      !["sms", "email"].includes(p.action.kind) ||
      ["delivered", "failed"].includes(deliveryState ?? "")
    )
      return;
    let live = true;
    const refresh = () => {
      void fetch(`/api/assistant/proposals?id=${p.id}`, {
        headers: { "X-MyARI-Owner": owner },
      })
        .then(async (r) => {
          const d = await r.json();
          if (live && r.ok && d.outcome) setOutcome(d.outcome);
        })
        .catch(() => undefined);
    };
    refresh();
    let remaining = 24;
    const timer = setInterval(() => {
      if (--remaining < 0) {
        clearInterval(timer);
        return;
      }
      if (document.visibilityState !== "hidden") refresh();
    }, 5000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [p.id, p.action.kind, owner, outcomeState, deliveryState]);
  async function mutate(mode: "save" | "cancel" | "edit" | "check") {
    if (
      mode === "save" &&
      !allowSending &&
      ["sms", "email"].includes(p.action.kind)
    ) {
      setError(
        "Sending is unavailable in this workspace. This is a draft only.",
      );
      return;
    }
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
    <article className="assistant-preview" data-kind={p.action.kind}>
      <header>
        <strong>
          {p.action.kind.replaceAll("_", " ")} ·{" "}
          {(outcome?.state === "completed"
            ? (outcome.delivery?.state ?? outcome.state)
            : outcome?.state) ?? "Proposed"}
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
          {p.action.kind === "campaign" && Array.isArray(parsedDraft.steps) && (
            <fieldset>
              <legend>Sequence steps</legend>
              {(
                parsedDraft.steps as {
                  type: string;
                  day: number;
                  title: string;
                  description: string;
                }[]
              ).map((step, index) => (
                <div key={index} className="aw-step-editor">
                  <label>
                    Day
                    <input
                      type="number"
                      min={1}
                      max={365}
                      aria-label={`Step ${index + 1} day`}
                      value={step.day}
                      onChange={(e) => {
                        const next = JSON.parse(draft);
                        next.steps[index].day = Number(e.target.value);
                        setDraft(JSON.stringify(next));
                      }}
                    />
                  </label>
                  <label>
                    Channel
                    <select
                      aria-label={`Step ${index + 1} channel`}
                      value={step.type}
                      onChange={(e) => {
                        const next = JSON.parse(draft);
                        next.steps[index].type = e.target.value;
                        setDraft(JSON.stringify(next));
                      }}
                    >
                      {["sms", "email", "voicemail", "task"].map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Title
                    <input
                      aria-label={`Step ${index + 1} title`}
                      value={step.title}
                      onChange={(e) => {
                        const next = JSON.parse(draft);
                        next.steps[index].title = e.target.value;
                        setDraft(JSON.stringify(next));
                      }}
                    />
                  </label>
                  <label>
                    Message
                    <textarea
                      aria-label={`Step ${index + 1} message`}
                      value={step.description}
                      onChange={(e) => {
                        const next = JSON.parse(draft);
                        next.steps[index].description = e.target.value;
                        setDraft(JSON.stringify(next));
                      }}
                    />
                  </label>
                </div>
              ))}
            </fieldset>
          )}
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
          {outcome.delivery && (
            <span>
              {outcome.delivery.message}{" "}
              <a href={outcome.delivery.href}>View delivery evidence</a>
              <br />
            </span>
          )}
          {!outcome.delivery &&
            (outcome.result?.message ?? outcome.message ?? outcome.state)}
          {outcome.result?.href && (
            <>
              {" "}
              <a href={outcome.result.href}>Open created record</a>
            </>
          )}
        </p>
      )}
      {outcome &&
        ["sms", "email"].includes(p.action.kind) &&
        ["completed", "needs_review", "in_progress"].includes(outcome.state) &&
        !["delivered", "failed"].includes(outcome.delivery?.state ?? "") && (
          <button disabled={busy} onClick={() => void mutate("check")}>
            Refresh message status
          </button>
        )}
      {!allowSending && ["sms", "email"].includes(p.action.kind) && (
        <p>Message draft only. Sending is disabled in this workspace.</p>
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
          {p.executable &&
            (allowSending || !["sms", "email"].includes(p.action.kind)) && (
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
