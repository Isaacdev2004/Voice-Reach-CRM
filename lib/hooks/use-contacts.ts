"use client";

import { isUuid } from "@/lib/contacts/is-uuid";
import type { ContactSegment } from "@/lib/contacts/lifecycle";
import { useUser } from "@clerk/nextjs";
import { validateContactSnapshot, type ContactSnapshot } from "@/lib/contacts/validate-snapshot";
import { CONTACTS_CHANGED } from "@/lib/contacts/change-events";
import { useCallback, useEffect, useRef, useState } from "react";

export type ApiContact = {
  id: string;
  created_at?: string;
  /** Existing contacts.last_contacted date; not inferred from creation time. */
  last_contacted?: string | null;
  /** Optional existing feed data; no tags are synthesized when absent. */
  tags?: string[] | null;
  first_name: string;
  last_name?: string | null;
  phone: string;
  email?: string | null;
  type?: string | null;
  category?: string | null;
  source?: string | null;
  notes?: string | null;
  lead_type?: string | null;
  preferred_area?: string | null;
  property_address?: string | null;
  budget?: number | string | null;
  dnc?: boolean;
  market?: "residential" | "commercial" | null;
  consent_records?: {
    status: string;
    consent_date?: string | null;
    source?: string | null;
    proof_reference?: string | null;
    created_at?: string;
  }[];
};

export type ContactCounts = {
  all: number;
  coldLead: number;
  activeLead: number;
  pastClient: number;
  residential?: number;
  commercial?: number;
  byCategory?: Record<string, number>;
};

export function useContacts(
  query?: string,
  segment: ContactSegment = "all",
  category: string = "all",
) {
  const { user, isLoaded, isSignedIn } = useUser();
  const ownerId = user?.id;
  const requestKey = JSON.stringify([ownerId, query ?? "", segment, category]);
  const [state, setState] = useState<{ key: string; data: ContactSnapshot | null; loading: boolean; error: string | null }>({ key: "", data: null, loading: true, error: null });
  const sequence = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const cancel = useCallback(() => { sequence.current++; pending.current?.abort(); }, []);
  const refresh = useCallback(async () => {
    const attempt = ++sequence.current;
    pending.current?.abort();
    if (!isLoaded || !isSignedIn || !ownerId) {
      setState({ key: requestKey, data: null, loading: !isLoaded, error: isLoaded ? "Sign in to view your contacts." : null });
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setState({ key: requestKey, data: null, loading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (query?.trim()) params.set("q", query.trim());
      if (segment !== "all") params.set("segment", segment);
      if (category !== "all") params.set("category", category);
      const res = await fetch(`/api/contacts${params.size ? `?${params}` : ""}`, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]) });
      if (!res.ok) throw new Error("Contact totals unavailable");
      const data = validateContactSnapshot(await res.json(), { ownerId, requireAll: !query?.trim() && segment === "all" && category === "all" });
      if (attempt === sequence.current) setState({ key: requestKey, data, loading: false, error: null });
    } catch {
      if (attempt === sequence.current) setState({ key: requestKey, data: null, loading: false, error: "Unable to load accurate contact totals. Please retry." });
    }
  }, [ownerId, isLoaded, isSignedIn, query, segment, category, requestKey]);

  useEffect(() => {
    void refresh();
    return cancel;
  }, [refresh, cancel]);
  useEffect(() => {
    const reload = () => { void refresh(); };
    const visible = () => { if (document.visibilityState === "visible") reload(); };
    const storage = (event: StorageEvent) => { if (event.key === CONTACTS_CHANGED) reload(); };
    window.addEventListener(CONTACTS_CHANGED, reload);
    window.addEventListener("storage", storage);
    window.addEventListener("focus", reload);
    window.addEventListener("pageshow", reload);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener(CONTACTS_CHANGED, reload);
      window.removeEventListener("storage", storage);
      window.removeEventListener("focus", reload);
      window.removeEventListener("pageshow", reload);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);
  const current = state.key === requestKey && isLoaded && isSignedIn && ownerId;
  return { contacts: current ? state.data?.contacts ?? [] : [],
    meta: current ? state.data : null, loading: current ? state.loading : !isLoaded || Boolean(ownerId),
    error: current ? state.error : isLoaded && !ownerId ? "Sign in to view your contacts." : null, refresh };
}

export function useContact(id: string | undefined) {
  const [contact, setContact] = useState<ApiContact | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    if (!isUuid(id)) {
      setContact(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${id}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Contact not found");
      }
      const data = await res.json();
      setContact(data.contact);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load contact");
      setContact(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { contact, loading, error, refresh };
}
