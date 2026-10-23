"use client";
import { useCallback, useEffect, useState } from "react";
import { isPropertySearchUrl } from "@/lib/property-finder/zillow";
import { PROPERTY_HISTORY_LABELS, type PropertyHistoryEntry } from "@/lib/property-finder/history";

export function PropertySearchHistory({ revision }: { revision: number }) {
  const [entries, setEntries] = useState<PropertyHistoryEntry[]>([]);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const reload = useCallback(() => setRetry(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(false);
    fetch("/api/property-finder/history", { cache: "no-store", signal: controller.signal }).then(async res => {
      const data = await res.json();
      if (!res.ok || data.success !== true || !Array.isArray(data.entries)) throw Error();
      if (!controller.signal.aborted) setEntries(data.entries.filter((entry: PropertyHistoryEntry) => entry.metadata && Object.hasOwn(PROPERTY_HISTORY_LABELS, entry.metadata.kind) && isPropertySearchUrl(entry.metadata.url)));
    }).catch(() => { if (!controller.signal.aborted) setError(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision, retry]);
  return <details className="pf-search-history"><summary>Search & sharing history</summary><p>Latest 50 recorded actions. A composer opening does not confirm sending, delivery, or a client view.</p>
    {loading ? <p role="status">Loading search history…</p> : error ? <p role="alert">History could not be loaded. <button type="button" className="pf-text-action" onClick={reload}>Retry history</button></p> : !entries.length ? <p>Your searches and explicit sharing actions will appear here.</p> : <ul>{entries.map(entry => <li key={entry.id}><span>{PROPERTY_HISTORY_LABELS[entry.metadata.kind]}</span><a href={entry.metadata.url} target="_blank" rel="noopener noreferrer">Open search ↗</a><time dateTime={entry.created_at}>{Number.isFinite(Date.parse(entry.created_at)) ? new Date(entry.created_at).toLocaleString() : "Date unavailable"}</time></li>)}</ul>}
  </details>;
}
