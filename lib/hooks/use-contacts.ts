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
  last_engagement_at?: string | null;
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
  preferred_property_type?: string | null;
  preferred_sqft?: number | string | null;
  preferred_beds?: number | string | null;
  preferred_baths?: number | string | null;
  preferred_garage_spaces?: number | string | null;
  preferred_lot_sqft?: number | string | null;
  property_address?: string | null;
  budget?: number | string | null;
  dnc?: boolean;
  opt_out_requested?: boolean | null;
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
  const { user, isLoaded, isSignedIn } = useUser();
  const ownerId = user?.id;
  const key = JSON.stringify([ownerId, id]);
  const [state, setState] = useState<{ key: string; contact: ApiContact | null; loading: boolean; error: string | null }>({ key: "", contact: null, loading: true, error: null });
  const sequence = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    const attempt = ++sequence.current;
    pending.current?.abort();
    if (!isLoaded) return;
    if (!isSignedIn || !ownerId || !id || !isUuid(id)) {
      setState({ key, contact: null, loading: false, error: "Contact unavailable. Open a saved contact from your list." });
      return;
    }
    const controller = new AbortController(); pending.current = controller;
    setState({ key, contact: null, loading: true, error: null });
    try {
      const res = await fetch(`/api/contacts/${id}`, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]) });
      if (!res.ok) throw new Error("Contact unavailable");
      const data = await res.json();
      if (data.success !== true || !data.contact || data.contact.id !== id || data.contact.owner_id !== ownerId) throw new Error("Contact unavailable");
      if (attempt === sequence.current) setState({ key, contact: data.contact, loading: false, error: null });
    } catch {
      if (attempt === sequence.current) setState({ key, contact: null, loading: false, error: "Unable to load this contact. It may have been removed or be unavailable to your account." });
    }
  }, [id, ownerId, isLoaded, isSignedIn, key]);
  const cancel = useCallback(() => { sequence.current++; pending.current?.abort(); }, []);
  useEffect(() => {
    void refresh();
    const changed = () => { void refresh(); };
    window.addEventListener(CONTACTS_CHANGED, changed);
    return () => { cancel(); window.removeEventListener(CONTACTS_CHANGED, changed); };
  }, [refresh, cancel]);
  const current = state.key === key && isLoaded;
  return { contact: current ? state.contact : null, loading: current ? state.loading : true, error: current ? state.error : null, refresh };
}
