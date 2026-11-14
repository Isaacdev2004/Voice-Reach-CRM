import { z } from 'zod';
import { apiError, apiOk } from '@/lib/api-response';
import { evaluateEligibility } from '@/lib/compliance';
import { contactMatchesCategory, categoriesUsedOnContacts, mergeCategoryLists } from './categories';
import type { OwnedContact } from './read-snapshot';
const schema = z.object({ search: z.string().max(512).default(''), page: z.number().int().min(1).max(100000).default(1), excludeIds: z.array(z.string().uuid()).max(30000).default([]), onlyIds: z.array(z.string().uuid()).max(30000).optional() }).strict();
/** Read-only recipient picker; eligibility and category totals cover the full owned set, not a page. */
export function createRecipientPageHandler(deps: {
    requireOwnerId: () => Promise<string>;
    readContacts: (owner: string) => Promise<OwnedContact[]>;
    loadCategories: (owner: string) => Promise<string[] | undefined>;
}) {
    return async (request: Request) => {
        const owner = await deps.requireOwnerId();
        if (!owner)
            throw Error('Unauthorized');
        const text = await request.text();
        if (Buffer.byteLength(text) > 2500000)
            return apiError('Contact selection is too large.', { status: 413 });
        let raw;
        try {
            raw = JSON.parse(text);
        }
        catch {
            return apiError('Invalid contact filters.', { status: 400 });
        }
        const parsed = schema.safeParse(raw);
        if (!parsed.success)
            return apiError('Invalid contact filters.', { status: 400 });
        try {
            const [rows, saved] = await Promise.all([deps.readContacts(owner), deps.loadCategories(owner)]);
            if (rows.some(row => row.owner_id !== owner))
                throw Error('Ownership mismatch');
            const excluded = new Set(parsed.data.excludeIds), only = parsed.data.onlyIds ? new Set(parsed.data.onlyIds) : null;
            const pool = rows.filter(row => !excluded.has(row.id) && (!only || only.has(row.id))).map(row => ({ ...row, eligibility: evaluateEligibility(row) }));
            const categories = mergeCategoryLists(saved, categoriesUsedOnContacts(rows));
            const eligible = pool.filter(row => row.eligibility.eligible);
            const q = parsed.data.search.trim().toLowerCase();
            const matching = pool.filter(row => !q || `${row.first_name} ${row.last_name ?? ''}`.trim().toLowerCase().includes(q) || (row.email ?? '').toLowerCase().includes(q) || (row.phone ?? '').toLowerCase().includes(q) || (row.category ?? '').toLowerCase().includes(q));
            const pages = Math.max(1, Math.ceil(matching.length / 50)), page = Math.min(parsed.data.page, pages);
            return apiOk({ contacts: matching.slice((page - 1) * 50, page * 50).map(row => ({ id: row.id, owner_id: row.owner_id, first_name: row.first_name, last_name: row.last_name, phone: row.phone, email: row.email, category: row.category, type: row.type, dnc: row.dnc, consent_records: row.consent_records, eligibility: row.eligibility })), categories, total: pool.length, filtered: matching.length, page, pages, eligibleCount: eligible.length, eligibleByCategory: Object.fromEntries(categories.map(name => [name, eligible.filter(row => contactMatchesCategory(row, name)).length])) });
        }
        catch {
            return apiError('Unable to load recipient options. Please retry.', { status: 503 });
        }
    };
}
