"use client";

import { useCallback, useEffect, useState } from "react";

export type ApiContact = {
  id: string;
  first_name: string;
  last_name?: string | null;
  phone: string;
  email?: string | null;
  type?: string | null;
  source?: string | null;
  notes?: string | null;
  dnc?: boolean;
  consent_records?: {
    status: string;
    consent_date?: string | null;
    source?: string | null;
    proof_reference?: string | null;
    created_at?: string;
  }[];
};

export function useContacts(query?: string) {
  const [contacts, setContacts] = useState<ApiContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ total: number; filtered: number } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query?.trim();
      const url = q ? `/api/contacts?q=${encodeURIComponent(q)}` : "/api/contacts";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load contacts");
      }
      const data = await res.json();
      setContacts(data.contacts ?? []);
      setMeta({ total: data.total ?? data.contacts?.length ?? 0, filtered: data.filtered ?? data.contacts?.length ?? 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load contacts");
      setContacts([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { contacts, loading, error, refresh, meta };
}

export function useContact(id: string | undefined) {
  const [contact, setContact] = useState<ApiContact | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
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
