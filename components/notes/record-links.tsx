"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { notesRequest } from "./use-notes-workspace";
import type { NoteMetadata } from "@/lib/notes/workspace";
type RecordRow = {
  id: string;
  name?: string;
  title?: string;
  status?: string;
  completed?: boolean;
};
export function RecordLinks({
  metadata,
  onChange,
}: {
  metadata: NoteMetadata;
  onChange: (m: Partial<NoteMetadata>) => void;
}) {
  const [data, setData] = useState<{
      campaigns: RecordRow[];
      tasks: RecordRow[];
    }>({ campaigns: [], tasks: [] }),
    [query, setQuery] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    notesRequest<typeof data>("/api/notes/associations")
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {
        if (active)
          setError("CRM links are unavailable. Existing links are preserved.");
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <details className="notes-record-picker">
      <summary>Link campaigns & tasks</summary>
      <label>
        Search your records
        <input
          aria-label="Search campaigns and tasks"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {(
        [
          [
            "campaignIds",
            data.campaigns,
            "Campaigns",
            "/dashboard/campaigns?edit=",
          ],
          ["taskIds", data.tasks, "Tasks", "/dashboard/tasks?task="],
        ] as const
      ).map(([key, rows, title, href]) => (
        <section key={key}>
          <h4>{title}</h4>
          {metadata[key].map((id) => {
            const row = rows.find((r) => r.id === id);
            return (
              <span className="notes-record-chip" key={id}>
                {row ? (
                  <Link href={href + id}>{row.name ?? row.title}</Link>
                ) : (
                  <span>Unavailable linked record</span>
                )}
                <button
                  aria-label={`Remove ${row?.name ?? row?.title ?? "unavailable record"} link`}
                  onClick={() =>
                    onChange({ [key]: metadata[key].filter((x) => x !== id) })
                  }
                >
                  ×
                </button>
              </span>
            );
          })}
          <div className="notes-options">
            {rows
              .filter((r) =>
                (r.name ?? r.title ?? "")
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .slice(0, 25)
              .map((row) => (
                <label key={row.id}>
                  <input
                    type="checkbox"
                    checked={metadata[key].includes(row.id)}
                    disabled={
                      metadata[key].length >= 20 &&
                      !metadata[key].includes(row.id)
                    }
                    onChange={(e) =>
                      onChange({
                        [key]: e.target.checked
                          ? [...metadata[key], row.id]
                          : metadata[key].filter((x) => x !== row.id),
                      })
                    }
                  />
                  {row.name ?? row.title}
                  <small>
                    {row.status ?? (row.completed ? "Completed" : "Open")}
                  </small>
                </label>
              ))}
          </div>
          {!rows.length && <p>No available {title.toLowerCase()}.</p>}
        </section>
      ))}
      <p>
        Properties use saved CRM contact addresses. Independent transaction and
        opportunity records are not available in this CRM schema.
      </p>
    </details>
  );
}
