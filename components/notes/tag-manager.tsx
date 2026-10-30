"use client";
import { useEffect, useState } from "react";
import { notesRequest } from "./use-notes-workspace";
import { noteTagKey } from "@/lib/notes/workspace";
type Tag = { id: string; name: string };
export function TagManager({
  selected,
  onAssign,
  beforeManage,
  onManaged,
}: {
  selected: string[];
  onAssign: (tags: string[]) => void;
  beforeManage: () => Promise<boolean>;
  onManaged: () => Promise<void>;
}) {
  const [tags, setTags] = useState<Tag[]>([]),
    [name, setName] = useState(""),
    [rename, setRename] = useState<Tag | null>(null),
    [remove, setRemove] = useState<Tag | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      const d = await notesRequest<{ tags: Tag[] }>("/api/notes/tags");
      setTags(d.tags);
      setError("");
    } catch {
      setError(
        "Tag management requires the Notes 2 database upgrade. Existing note tags remain editable.",
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function manage(action: "create" | "rename" | "delete") {
    setBusy(true);
    try {
      if (!(await beforeManage())) return;
      await notesRequest("/api/notes/tags", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          id: rename?.id ?? remove?.id,
          name,
          expectedName: rename?.name ?? remove?.name,
          confirmed: true,
        }),
      });
      setName("");
      setRename(null);
      setRemove(null);
      await onManaged();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tag could not be changed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="notes-tags-manager">
      <summary>Manage tags</summary>
      <p>
        Assign tags to this note. Renaming or deleting updates your notes,
        preserving earlier versions.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="notes-tag-catalog">
        {tags.map((t) => (
          <div key={t.id}>
            <label>
              <input
                type="checkbox"
                checked={selected.some(
                  (s) => noteTagKey(s) === noteTagKey(t.name),
                )}
                onChange={(e) =>
                  onAssign(
                    e.target.checked
                      ? [...selected, t.name]
                      : selected.filter(
                          (s) => noteTagKey(s) !== noteTagKey(t.name),
                        ),
                  )
                }
              />
              {t.name}
            </label>
            <button
              aria-label={`Rename ${t.name}`}
              onClick={() => {
                setRename(t);
                setRemove(null);
                setName(t.name);
              }}
            >
              Rename
            </button>
            <button
              aria-label={`Delete tag ${t.name}`}
              onClick={() => {
                setRemove(t);
                setRename(null);
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
      {remove ? (
        <>
          <p>
            Remove “{remove.name}” from your tag library and all your notes?
            Notes remain intact.
          </p>
          <button disabled={busy} onClick={() => void manage("delete")}>
            Confirm tag deletion
          </button>
          <button onClick={() => setRemove(null)}>Cancel</button>
        </>
      ) : (
        <>
          <label>
            {rename ? `Rename ${rename.name}` : "New tag"}
            <input
              aria-label="Tag name"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <button
            disabled={busy || !name.trim()}
            onClick={() => void manage(rename ? "rename" : "create")}
          >
            {busy ? "Saving…" : rename ? "Confirm rename" : "Create tag"}
          </button>
          {rename && (
            <button
              onClick={() => {
                setRename(null);
                setName("");
              }}
            >
              Cancel
            </button>
          )}
        </>
      )}
    </details>
  );
}
