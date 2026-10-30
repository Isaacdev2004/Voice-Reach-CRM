"use client";
import { useState } from "react";
import { notesRequest } from "./use-notes-workspace";
import type { WorkspaceNote } from "@/lib/notes/workspace";
export function VersionHistory({
  versions,
  current,
  owner,
  onRestored,
}: {
  versions: WorkspaceNote[];
  current: WorkspaceNote;
  owner: string;
  onRestored: (n: WorkspaceNote) => void;
}) {
  const [selected, setSelected] = useState(versions[0]?.id ?? ""),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const version = versions.find((v) => v.id === selected);
  async function restore() {
    if (!version) return;
    setBusy(true);
    setError("");
    try {
      const data = await notesRequest<{ note: WorkspaceNote }>(
        `/api/notes/${current.id}/restore`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            versionId: version.id,
            expectedRevision: current.revision,
            confirmation: "RESTORE_NOTE",
          }),
        },
      );
      onRestored(data.note);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Restore unavailable. Your current note is unchanged.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="notes-history">
      <p>
        Compare up to 50 saved revisions. Restoring archives your current
        revision first. Historical tags and links are restored; deleted records
        must be removed before restoring.
      </p>
      {!versions.length ? (
        <p>No previous versions yet.</p>
      ) : (
        <>
          <label>
            Saved revision
            <select
              aria-label="Saved revision"
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setConfirm(false);
              }}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  Revision {v.revision} ·{" "}
                  {new Date(v.created_at).toLocaleString()} · {v.title}
                </option>
              ))}
            </select>
          </label>
          {version && (
            <>
              <p>
                {version.edited_by === owner
                  ? "Edited by you"
                  : version.edited_by
                    ? "Verified account editor"
                    : "Editor not recorded for this historical revision"}
              </p>
              <p>
                {version.title !== current.title
                  ? "Title changed. "
                  : "Title unchanged. "}
                {version.body !== current.body
                  ? "Content changed. "
                  : "Content unchanged. "}
                {JSON.stringify(version.metadata) !==
                JSON.stringify(current.metadata)
                  ? "Tags or links changed."
                  : "Tags and links unchanged."}
              </p>
              <div className="notes-comparison">
                <section>
                  <h3>Selected revision</h3>
                  <strong>{version.title}</strong>
                  <pre>{version.body}</pre>
                  <small>
                    Tags: {version.metadata.tags?.join(", ") || "None"}
                  </small>
                </section>
                <section>
                  <h3>Current saved note</h3>
                  <strong>{current.title}</strong>
                  <pre>{current.body}</pre>
                  <small>
                    Tags: {current.metadata.tags.join(", ") || "None"}
                  </small>
                </section>
              </div>
              <label className="notes-consent">
                <input
                  type="checkbox"
                  checked={confirm}
                  onChange={(e) => setConfirm(e.target.checked)}
                />
                Restore this revision and preserve the current one in history
              </label>
              <button
                className="notes-primary"
                disabled={busy || !confirm}
                onClick={() => void restore()}
              >
                {busy ? "Restoring…" : "Restore this version"}
              </button>
            </>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
