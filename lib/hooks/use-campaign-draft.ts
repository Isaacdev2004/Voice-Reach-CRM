"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { draftFingerprint } from "@/lib/campaigns/draft-fingerprint";
import { safeFetch } from "@/lib/api-response";
import type { CampaignDefinition } from "@/lib/crm/types";
export type DraftVersion = { revision: number; saved_at: string };
type DraftReply = {
  draft: {
    revision: number;
    snapshot: CampaignDefinition;
    state: string;
  } | null;
  versions: DraftVersion[];
  version?: { snapshot: CampaignDefinition; revision: number } | null;
};
export function useCampaignDraft(
  owner: string | undefined,
  id: string,
  ready: boolean,
  campaign: CampaignDefinition,
  onLoad: (snapshot: CampaignDefinition) => void,
) {
  const [state, setState] = useState("Loading draft"),
    [error, setError] = useState(""),
    [hydrated, setHydrated] = useState(false),
    [versions, setVersions] = useState<DraftVersion[]>([]);
  const [hydrationKey, setHydrationKey] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [recovery, setRecovery] = useState<CampaignDefinition | null>(null),
    [comparison, setComparison] = useState<CampaignDefinition | null>(null);
  const revision = useRef(0),
    saved = useRef(""),
    latest = useRef(campaign),
    busy = useRef<Promise<{
      revision: number;
      snapshot: CampaignDefinition;
    }> | null>(null);
  const pending = useRef<{
    key: string;
    text: string;
    expected: number;
    operationId: string;
    snapshot: CampaignDefinition;
  } | null>(null);
  const blocked = useRef(false),
    generation = useRef(0),
    onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;
  latest.current = campaign;
  const key = owner ? `myari:campaign-draft:${owner}:${id}` : "";
  const recoveryFile = useRef({ key: "", storageKey: "" });
  if (recoveryFile.current.key !== key)
    recoveryFile.current = { key, storageKey: `${key}:${crypto.randomUUID()}` };
  useEffect(() => {
    if (!ready || !owner) {
      setHydrated(false);
      setVersions([]);
      setRecovery(null);
      setComparison(null);
      setState("Loading draft");
      return;
    }
    const g = ++generation.current;
    setHydrated(false);
    setHydrationKey(key);
    setError("");
    setRecovery(null);
    setComparison(null);
    revision.current = 0;
    pending.current = null;
    blocked.current = false;
    (async () => {
      const response = await safeFetch<DraftReply>(
        `/api/campaigns/drafts?id=${id}`,
        { cache: "no-store" },
      );
      if (g !== generation.current) return;
      let local: CampaignDefinition | null = null;
      try {
        const candidates = Object.keys(localStorage)
          .filter((k) => k === key || k.startsWith(key + ":"))
          .map((k) => {
            try {
              return JSON.parse(localStorage.getItem(k) || "null");
            } catch {
              return null;
            }
          })
          .filter((e) => e?.snapshot && !e.confirmedRevision)
          .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
        local = candidates[0]?.snapshot ?? null;
      } catch {
        /* Preserve malformed original storage. */
      }
      if (!response.success) {
        setError(response.error);
        setState("Save Failed");
        setRecovery(local);
        blocked.current = true;
        return;
      }
      const server = response.data.draft;
      revision.current = server?.revision ?? 0;
      const baseline = server?.snapshot ?? latest.current;
      saved.current = draftFingerprint(baseline);
      if (server) onLoadRef.current(baseline);
      blocked.current = !!server && server.state !== "draft";
      setVersions(response.data.versions);
      setState(server ? "Saved" : "Not yet saved");
      if (local && draftFingerprint(local) !== draftFingerprint(baseline))
        setRecovery(local);
      setHydrationKey(key);
      setHydrated(true);
    })();
    return () => {
      if (generation.current === g) generation.current = g + 1;
    };
  }, [ready, owner, id, key, loadAttempt]);
  const dirty =
    hydrated &&
    hydrationKey === key &&
    ready &&
    draftFingerprint(campaign) !== saved.current;
  const save = useCallback(async (): Promise<{
    revision: number;
    snapshot: CampaignDefinition;
  }> => {
    if (
      !owner ||
      !hydrated ||
      hydrationKey !== key ||
      !ready ||
      blocked.current
    )
      throw Error(
        "Draft is unavailable or has a conflicting revision. Preserve local changes and review history.",
      );
    if (busy.current) {
      await busy.current;
      return save();
    }
    const snapshot = structuredClone(latest.current),
      text = draftFingerprint(snapshot),
      g = generation.current;
    if (text === saved.current && revision.current)
      return { revision: revision.current, snapshot };
    // Keep the SAME operation and expected revision on ambiguous network retries.
    const operation = pending.current ?? {
      key,
      text,
      expected: revision.current,
      operationId: crypto.randomUUID(),
      snapshot,
    };
    try {
      localStorage.setItem(
        recoveryFile.current.storageKey,
        JSON.stringify({
          version: 1,
          snapshot: latest.current,
          savedAt: new Date().toISOString(),
        }),
      );
    } catch {
      /* Server saving remains available. */
    }
    pending.current = operation;
    setState("Saving");
    setError("");
    const task = (async () => {
      const response = await safeFetch<{
        revision: number;
        snapshot: CampaignDefinition;
        savedAt: string;
      }>("/api/campaigns/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: id,
          expectedRevision: operation.expected,
          operationId: operation.operationId,
          snapshot: operation.snapshot,
        }),
      });
      if (!response.success) {
        if (g === generation.current) {
          setState("Save Failed");
          setError(response.error);
          if (response.code === "revision_conflict") blocked.current = true;
        }
        throw Error(response.error);
      }
      if (g !== generation.current)
        throw Error(
          "Editor changed while saving. Original draft is preserved.",
        );
      revision.current = response.data.revision;
      saved.current = draftFingerprint(response.data.snapshot);
      pending.current = null;
      try {
        const raw = localStorage.getItem(recoveryFile.current.storageKey),
          entry = raw ? JSON.parse(raw) : null;
        if (entry && draftFingerprint(entry.snapshot) === saved.current)
          localStorage.setItem(
            recoveryFile.current.storageKey,
            JSON.stringify({
              ...entry,
              confirmedRevision: response.data.revision,
            }),
          );
      } catch {
        /* Never remove recovery data on storage errors. */
      }
      setState(
        draftFingerprint(latest.current) === saved.current
          ? "Saved"
          : "Unsaved changes",
      );
      setVersions((v) => [
        {
          revision: response.data.revision,
          saved_at: response.data.savedAt,
        },
        ...v.filter((x) => x.revision !== response.data.revision),
      ]);
      const url = new URL(window.location.href);
      if (url.searchParams.get("edit") !== id) {
        url.searchParams.set("edit", id);
        url.searchParams.delete("new");
        url.searchParams.delete("premium");
        window.history.replaceState(window.history.state, "", url);
      }
      return response.data;
    })();
    busy.current = task;
    let result;
    try {
      result = await task;
    } finally {
      busy.current = null;
    }
    // A previous ambiguous save may have completed while the user continued typing.
    if (draftFingerprint(latest.current) !== saved.current) return save();
    return result;
  }, [owner, hydrated, hydrationKey, ready, id, key]);
  useEffect(() => {
    if (!ready || hydrationKey !== key || !hydrated || !key || !dirty) return;
    try {
      localStorage.setItem(
        recoveryFile.current.storageKey,
        JSON.stringify({
          version: 1,
          snapshot: campaign,
          savedAt: new Date().toISOString(),
        }),
      );
    } catch {
      setError(
        "Local recovery storage unavailable. Keep this tab open until the server save succeeds.",
      );
    }
    if (blocked.current) return;
    setState("Unsaved changes");
    const timer = setTimeout(() => {
      void save().catch(() => {});
    }, 1200);
    return () => clearTimeout(timer);
  }, [campaign, dirty, hydrated, hydrationKey, ready, key, save]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty || busy.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const navigate = (event: MouseEvent) => {
      const a = (event.target as Element).closest?.("a[href]");
      if (
        (dirty || busy.current) &&
        a &&
        !window.confirm(
          "Your latest edits are not confirmed saved. Leave this editor?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
  const viewVersion = async (r: number) => {
    const response = await safeFetch<DraftReply>(
      `/api/campaigns/drafts?id=${id}&revision=${r}`,
      { cache: "no-store" },
    );
    if (!response.success) {
      setError(response.error);
      return;
    }
    setComparison(response.data.version?.snapshot ?? null);
  };
  return {
    reload: () => {
      if (
        window.confirm(
          "Reload the latest server draft? Local recovery data will be retained.",
        )
      )
        setLoadAttempt((x) => x + 1);
    },
    state: dirty && state === "Saved" ? "Unsaved changes" : state,
    error,
    dirty,
    hydrated: hydrated && hydrationKey === key && ready,
    save,
    versions: hydrationKey === key && ready ? versions : [],
    recovery: hydrationKey === key ? recovery : null,
    comparison: hydrationKey === key ? comparison : null,
    restoreLocal: () => {
      if (recovery) {
        onLoadRef.current(recovery);
        setRecovery(null);
      }
    },
    viewVersion,
    loadOlder: async () => {
      const oldest = Math.min(...versions.map((v) => v.revision));
      if (!Number.isFinite(oldest) || oldest === 0) return;
      const response = await safeFetch<DraftReply>(
        `/api/campaigns/drafts?id=${id}&beforeRevision=${oldest}`,
        { cache: "no-store" },
      );
      if (!response.success) {
        setError(response.error);
        return;
      }
      setVersions((current) => [
        ...current,
        ...response.data.versions.filter(
          (v) => !current.some((c) => c.revision === v.revision),
        ),
      ]);
    },
    restoreVersion: () => {
      if (
        comparison &&
        window.confirm(
          "Restore this version as a new draft revision? Current server history will be retained.",
        )
      ) {
        onLoadRef.current(comparison);
        setComparison(null);
      }
    },
    dismissComparison: () => setComparison(null),
  };
}
