import { withApiHandler } from '@/lib/api-response';
import { requireUserId } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { readContactSnapshot } from '@/lib/contacts/read-snapshot';
import { loadSavedSettings } from '@/lib/billing/settings-store';
import { createRecipientPageHandler } from '@/lib/contacts/recipient-page-handler';
const handler = createRecipientPageHandler({ requireOwnerId: requireUserId, readContacts: owner => readContactSnapshot(supabaseAdmin, owner), loadCategories: async (owner) => (await loadSavedSettings(owner))?.contactCategories });
// POST is a private read, never enrollment, consent or delivery.
export const POST = withApiHandler(async (request) => { const response = await handler(request); response.headers.set('Cache-Control', 'private, no-store'); response.headers.set('Vary', 'Cookie, Authorization'); return response; });
