"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MetadataSchema,
  type NoteContact,
  type WorkspaceNote,
  metadataOf,
} from "@/lib/notes/workspace";
import type { NotesMode } from "@/lib/notes/compatibility";
import type { NoteKind } from "@/lib/notes/types";
export type Draft = {
  id: string | null;
  clientKey: string;
  revision: number;
  expectedUpdatedAt?: string | null;
  title: string;
  body: string;
  kind: NoteKind;
  metadata: ReturnType<typeof metadataOf>;
};
export const blankDraft = (): Draft => ({
  id: null,
  clientKey: crypto.randomUUID(),
  revision: 0,
  title: "",
  body: "",
  kind: "note",
  metadata: MetadataSchema.parse({}),
});
export function draftOf(n: WorkspaceNote): Draft {
  return {
    id: n.id,
    clientKey: n.client_key,
    revision: n.revision,
    expectedUpdatedAt: n.updated_at ?? null,
    title: n.title,
    body: n.body,
    kind: n.kind,
    metadata: metadataOf({
      ...n,
      metadata: {
        ...n.metadata,
        contactIds: [
          ...new Set(
            [n.contact_id, ...(n.metadata?.contactIds ?? [])].filter(Boolean),
          ),
        ],
      },
    }),
  };
}
export async function notesRequest<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(70000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.success === false) {
    const error = new Error(
      response.status === 409 && data?.code !== "upgrade_required"
        ? "A newer version exists. Your draft is preserved. Review the server version before continuing."
        : typeof data?.error === "string"
          ? data.error
          : "Unable to complete this action. Please try again.",
    );
    Object.assign(error, {
      conflict: response.status === 409 && data?.code !== "upgrade_required",
    });
    throw error;
  }
  return data as T;
}
const stamp = (d: Draft) =>
  JSON.stringify({
    title: d.title,
    body: d.body,
    kind: d.kind,
    metadata: d.metadata,
  });
export function useNotesWorkspace(owner: string) {
  const [notes, setNotes] = useState<WorkspaceNote[]>([]),
    [contacts, setContacts] = useState<NoteContact[]>([]),
    [draft, setDraft] = useState<Draft>(blankDraft),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [status, setStatus] = useState("Not saved yet"),
    [mode, setMode] = useState<NotesMode>("read-only"),
    [loadError, setLoadError] = useState(false),
    [recovery, setRecovery] = useState<Draft | null>(null);
  const active = useRef(true),
    ref = useRef(draft),
    saved = useRef(stamp(draft)),
    busy = useRef<Promise<boolean> | null>(null),
    blocked = useRef(false),
    storageKey = `myari:notes:draft:${owner}`;
  ref.current = draft;
  const load = useCallback(async () => {
    try {
      const data = await notesRequest<{
        notes: WorkspaceNote[];
        contacts: NoteContact[];
        mode?: NotesMode;
      }>("/api/notes/workspace");
      if (!active.current) return;
      if (!Array.isArray(data.notes) || !Array.isArray(data.contacts))
        throw Error("Invalid notes response");
      setNotes(data.notes.map((n) => ({ ...n, metadata: metadataOf(n) })));
      setContacts(data.contacts);
      setMode(data.mode ?? "advanced");
      setLoadError(false);
      if (!blocked.current) setError("");
    } catch {
      if (active.current) {
        setLoadError(true);
        setStatus("Unable to load notes");
        setError(
          "Unable to load your notes. Your notes have not been deleted. Please retry.",
        );
      }
    } finally {
      if (active.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    active.current = true;
    void load();
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.owner === owner && Date.now() - data.at < 7 * 86400000) {
          const m = MetadataSchema.safeParse(data.draft?.metadata);
          if (
            m.success &&
            typeof data.draft?.body === "string" &&
            typeof data.draft?.title === "string"
          )
            setRecovery({ ...data.draft, metadata: m.data });
        } else localStorage.removeItem(storageKey);
      }
    } catch {
      /* Storage is optional. */
    }
    return () => {
      active.current = false;
    };
  }, [load, owner, storageKey]);
  const save = useCallback(
    async function persist(): Promise<boolean> {
      if (busy.current) {
        const ok = await busy.current;
        return ok && active.current ? persist() : ok;
      }
      if (blocked.current) return false;
      const snapshot = ref.current;
      if (
        stamp(snapshot) === saved.current ||
        (!snapshot.title.trim() && !snapshot.body.trim())
      )
        return true;
      if (active.current) setStatus("Saving…");
      const work = (async () => {
        try {
          const data = await notesRequest<{ note: WorkspaceNote }>(
            "/api/notes/workspace",
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                ...snapshot,
                expectedRevision: snapshot.revision,
              }),
            },
          );
          if (!active.current) return true;
          const n = { ...data.note, metadata: metadataOf(data.note) };
          saved.current = stamp(snapshot);
          setNotes((rows) => [n, ...rows.filter((r) => r.id !== n.id)]);
          if (ref.current.clientKey === snapshot.clientKey)
            ref.current = {
              ...ref.current,
              id: n.id,
              revision: n.revision,
              expectedUpdatedAt: n.updated_at ?? null,
            };
          setDraft((d) =>
            d.clientKey === snapshot.clientKey
              ? {
                  ...d,
                  id: n.id,
                  revision: n.revision,
                  expectedUpdatedAt: n.updated_at ?? null,
                }
              : d,
          );
          setStatus("Saved");
          setError("");
          if (stamp(ref.current) === stamp(snapshot)) {
            try {
              localStorage.removeItem(storageKey);
            } catch {}
          }
          return true;
        } catch (e) {
          if (!active.current) return false;
          const conflict = Boolean((e as { conflict?: boolean }).conflict);
          blocked.current = conflict;
          setStatus(
            conflict
              ? "Conflict — draft preserved"
              : "Save failed — draft preserved",
          );
          setError(
            e instanceof Error ? e.message : "Unable to save your note.",
          );
          return false;
        } finally {
          busy.current = null;
        }
      })();
      busy.current = work;
      const ok = await work;
      if (ok && active.current && stamp(ref.current) !== saved.current)
        return persist();
      return ok;
    },
    [storageKey],
  );
  useEffect(() => {
    if (stamp(draft) === saved.current) return;
    if (draft.title || draft.body)
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ owner, at: Date.now(), draft }),
        );
      } catch {
        /* Visible save status still reports server state. */
      }
    if (blocked.current) return;
    setStatus("Unsaved changes");
    const timer = setTimeout(() => {
      void save();
    }, 900);
    return () => clearTimeout(timer);
  }, [draft, save, storageKey, owner]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (stamp(ref.current) !== saved.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => {
    const navigate = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        stamp(ref.current) === saved.current
      )
        return;
      const a = (e.target as HTMLElement)?.closest("a");
      if (
        !a ||
        a.target === "_blank" ||
        !a.href ||
        a.origin !== location.origin ||
        (a.pathname === location.pathname && a.search === location.search)
      )
        return;
      e.preventDefault();
      void save().then((ok) => {
        if (ok) window.location.assign(a.href);
      });
    };
    document.addEventListener("click", navigate, true);
    return () => document.removeEventListener("click", navigate, true);
  }, [save]);
  async function open(n?: WorkspaceNote) {
    if (!(await save())) return false;
    blocked.current = false;
    const next = n
      ? draftOf(
          n.id === ref.current.id
            ? ({
                ...n,
                ...ref.current,
                client_key: ref.current.clientKey,
              } as WorkspaceNote)
            : n,
        )
      : blankDraft();
    saved.current = stamp(next);
    ref.current = next;
    setDraft(next);
    setStatus(n ? "Saved" : "Not saved yet");
    setError("");
    return true;
  }
  function restore() {
    if (!recovery) return;
    blocked.current = false;
    ref.current = recovery;
    setDraft(recovery);
    saved.current = "";
    setRecovery(null);
    setStatus("Recovered draft — review before saving");
    blocked.current = true;
  }
  function discardRecovery() {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setRecovery(null);
  }
  async function useServer() {
    try {
      if (!draft.id) {
        blocked.current = false;
        return;
      }
      await load();
      const data = await notesRequest<{ notes: WorkspaceNote[] }>(
        "/api/notes/workspace",
      );
      const n = data.notes.find((n) => n.id === draft.id);
      if (!n) {
        setError("The note no longer exists. Copy your draft before leaving.");
        return;
      }
      blocked.current = false;
      const next = draftOf(n);
      saved.current = stamp(next);
      ref.current = next;
      setDraft(next);
      setStatus("Saved");
      setError("");
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    } catch {
      setError(
        "Unable to load the latest version. Your local draft is preserved.",
      );
    }
  }
  async function saveRecoveryAsNew() {
    const next = {
      ...ref.current,
      id: null,
      clientKey: crypto.randomUUID(),
      revision: 0,
    };
    ref.current = next;
    setDraft(next);
    blocked.current = false;
    return save();
  }
  async function changeAndSave(update: (d: Draft) => Draft) {
    const next = update(ref.current);
    ref.current = next;
    setDraft(next);
    return save();
  }
  return {
    mode,
    loadError,
    getDraft: () => ref.current,
    changeAndSave,
    notes,
    contacts,
    draft,
    setDraft,
    loading,
    error,
    setError,
    status,
    recovery,
    restore,
    discardRecovery,
    save,
    open,
    load,
    useServer,
    saveRecoveryAsNew,
  };
}
