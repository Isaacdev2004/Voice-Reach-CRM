'use client';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
export type RecipientOption = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
    category?: string | null;
    type?: string | null;
    dnc?: boolean;
    eligibility: {
        eligible: boolean;
        issues: string[];
    };
    consent_records?: Array<{
        status: string;
        consent_date?: string | null;
        source?: string | null;
        proof_reference?: string | null;
        created_at?: string | null;
    }>;
};
type Result = {
    contacts: RecipientOption[];
    categories: string[];
    total: number;
    filtered: number;
    page: number;
    pages: number;
    eligibleCount: number;
    eligibleByCategory: Record<string, number>;
};
export function useRecipientPage(open: boolean, search: string, excludeIds: string[] = [], onlyIds?: string[], nameOnly=false) {
    const { user, isLoaded, isSignedIn } = useUser();
    const [page, setPage] = useState(1), [version, setVersion] = useState(0), [query, setQuery] = useState(search);
    useEffect(() => { const timer = setTimeout(() => { setQuery(search); setPage(1); }, 250); return () => clearTimeout(timer); }, [search]);
    const body = JSON.stringify({ search: query, page, excludeIds, nameOnly, ...(onlyIds ? { onlyIds } : {}) });
    const key = JSON.stringify([open, user?.id, body, version]);
    const [state, setState] = useState<{
        key: string;
        data: Result | null;
        error: string | null;
        loading: boolean;
    }>({ key: '', data: null, error: null, loading: false });
    useEffect(() => {
        if (!open || !isLoaded || !isSignedIn || !user?.id)
            return;
        const owner = user.id, controller = new AbortController();
        setState({ key, data: null, error: null, loading: true });
        void (async () => {
            try {
                const response = await fetch('/api/contacts/recipients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]) });
                const data = await response.json();
                if (!response.ok || data.success !== true || !Array.isArray(data.contacts) || data.contacts.length > 50 || data.contacts.some((row: {
                    owner_id?: string;
                }) => row.owner_id !== owner) || !Number.isSafeInteger(data.eligibleCount) || !data.eligibleByCategory)
                    throw Error();
                if (!controller.signal.aborted)
                    setState({ key, data, error: null, loading: false });
            }
            catch {
                if (!controller.signal.aborted)
                    setState({ key, data: null, error: 'Unable to load recipient options. Please retry.', loading: false });
            }
        })();
        return () => controller.abort();
    }, [key, body, open, isLoaded, isSignedIn, user?.id]);
    const current = state.key === key && open && isSignedIn;
    return { data: current ? state.data : null, loading: open && (!current || state.loading), error: current ? state.error : null, page: current ? state.data?.page ?? page : page, pages: current ? state.data?.pages ?? 1 : 1, setPage, refresh: () => setVersion(v => v + 1) };
}
