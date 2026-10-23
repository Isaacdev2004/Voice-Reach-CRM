"use client";
import { useState } from "react";
import { AI_ACTIONS, type NoteSummary } from "@/lib/notes/ai";
import { notesRequest } from "./use-notes-workspace";
export type SuggestedTask = {
  key: string;
  title: string;
  description: string;
  quote: string;
  approved: boolean;
  due: string;
};
export function AiReview({
  source,
  noteId,
  onSave,
  onTask,
}: {
  source: string;
  noteId?: string;
  onSave: (text: string) => void;
  onTask: (task: SuggestedTask, summary: string) => Promise<void>;
}) {
  const [action, setAction] = useState<(typeof AI_ACTIONS)[number]>(
      AI_ACTIONS[0],
    ),
    [approved, setApproved] = useState(false),
    [summary, setSummary] = useState<NoteSummary | null>(null),
    [edited, setEdited] = useState(""),
    [tasks, setTasks] = useState<SuggestedTask[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function generate() {
    setBusy(true);
    setError("");
    try {
      const data = await notesRequest<{ summary: NoteSummary }>(
        "/api/notes/assist",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ source, noteId, action, approved: true }),
        },
      );
      const s = data.summary;
      setSummary(s);
      setEdited(
        [
          `## Overview (AI draft — verify against source)\n${s.overview}`,
          ...(
            [
              ["Key discussion points", s.discussion],
              ["Client needs & preferences", s.preferences],
              ["Decisions made", s.decisions],
              ["Follow-up commitments", s.commitments],
            ] as const
          ).map(
            ([label, rows]) =>
              `## ${label}\n${rows.map((r) => "- " + r.text).join("\n") || "No explicit information recorded."}`,
          ),
          `## Questions requiring clarification\n${s.questions.map((t) => "- " + t).join("\n") || "None identified — review the source."}`,
          s.draft ? `## Suggested draft — review before use\n${s.draft}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      );
      setTasks(
        s.suggestions.map((t) => ({
          ...t,
          key: crypto.randomUUID(),
          approved: false,
          due: "",
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI is unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="notes-ai-review">
      <p>
        AI suggestions are unverified drafts. Only this note/transcript is sent
        to the configured AI provider. No contact updates, task creation,
        messages, or campaign enrollments happen automatically.
      </p>
      <label>
        AI action
        <select
          value={action}
          onChange={(e) => setAction(e.target.value as typeof action)}
        >
          {AI_ACTIONS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </label>
      <label className="notes-consent">
        <input
          type="checkbox"
          checked={approved}
          onChange={(e) => setApproved(e.target.checked)}
        />
        Send this text to AI for processing
      </label>
      <button
        className="notes-primary"
        disabled={!approved || busy || !source.trim()}
        onClick={() => void generate()}
      >
        {busy ? "Preparing review…" : "Generate draft"}
      </button>
      {error && <p role="alert">{error}</p>}
      {summary && (
        <>
          <h3>Review &amp; edit summary</h3>
          <textarea
            aria-label="AI summary draft"
            rows={15}
            value={edited}
            onChange={(e) => setEdited(e.target.value)}
          />
          <details>
            <summary>Source evidence</summary>
            {[
              ...summary.discussion,
              ...summary.preferences,
              ...summary.decisions,
              ...summary.commitments,
            ].map((p, i) => (
              <blockquote key={i}>
                <p>{p.text}</p>
                <q>{p.quote}</q>
              </blockquote>
            ))}
          </details>
          <details>
            <summary>Original source</summary>
            <pre>{source}</pre>
          </details>
          <button className="notes-primary" onClick={() => onSave(edited)}>
            Save summary without creating tasks
          </button>
          <h3>Suggested next actions</h3>
          <p>
            Choose individual actions, edit them, and confirm each task. Dates
            are never inferred.
          </p>
          {tasks.length === 0 && (
            <p>No grounded task suggestions were returned.</p>
          )}
          {tasks.map((t, i) => (
            <div key={t.key} className="notes-suggestion">
              <label className="notes-consent">
                <input
                  type="checkbox"
                  checked={t.approved}
                  onChange={(e) =>
                    setTasks((rows) =>
                      rows.map((r, j) =>
                        j === i ? { ...r, approved: e.target.checked } : r,
                      ),
                    )
                  }
                />
                Approve this suggestion
              </label>
              <input
                aria-label={`Suggested task ${i + 1}`}
                value={t.title}
                onChange={(e) =>
                  setTasks((rows) =>
                    rows.map((r, j) =>
                      j === i ? { ...r, title: e.target.value } : r,
                    ),
                  )
                }
              />
              <textarea
                aria-label={`Task description ${i + 1}`}
                value={t.description}
                onChange={(e) =>
                  setTasks((rows) =>
                    rows.map((r, j) =>
                      j === i ? { ...r, description: e.target.value } : r,
                    ),
                  )
                }
              />
              <q>{t.quote}</q>
              <button
                disabled={!t.approved || busy || !t.title.trim()}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onTask(t, edited);
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Unable to prepare task.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Review task details
              </button>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
