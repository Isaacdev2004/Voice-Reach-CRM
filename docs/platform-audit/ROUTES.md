# Implemented route inventory

Every row is a source inspection target, not a claim that all interactive states were tested. Dynamic feature/article expansions are in public-paths.json.

| Route | Kind/method | Authorization boundary | Source |
|---|---|---|---|
| `/sign-in/[[...sign-in]]` | Page  | Layout/proxy or public | [source](../../app/(auth)/sign-in/[[...sign-in]]/page.tsx) |
| `/sign-up/[[...sign-up]]` | Page  | Layout/proxy or public | [source](../../app/(auth)/sign-up/[[...sign-up]]/page.tsx) |
| `/dashboard/activity` | Page  | Layout/proxy or public | [source](../../app/(dashboard)/dashboard/activity/page.tsx) |
| `/dashboard/analytics` | Page  | Layout/proxy or public | [source](../../app/(dashboard)/dashboard/analytics/page.tsx) |
| `/dashboard/automations` | Page  | Layout/proxy or public | [source](../../app/(dashboard)/dashboard/automations/page.tsx) |
| `/dashboard/automations/rules` | Page  | Layout/proxy or public | [source](../../app/(dashboard)/dashboard/automations/rules/page.tsx) |
| `/dashboard/calendar` | Page  | Layout/proxy or public | [source](../../app/(dashboard)/dashboard/calendar/page.tsx) |
| `/dashboard/campaigns/[campaignId]` | Page  | Layout/proxy or public | [source](../../app/(dashboard)/dashboard/campaigns/[campaignId]/page.tsx) |
| `/dashboard/campaigns` | Page  | Layout/proxy or public | [source](../../app/(dashboard)/dashboard/campaigns/page.tsx) |
| `/dashboard/contacts/[id]` | Page  | Layout/proxy or public | [source](../../app/(dashboard)/dashboard/contacts/[id]/page.tsx) |
| `/dashboard/contacts` | Page  | Layout/proxy or public | [source](../../app/(dashboard)/dashboard/contacts/page.tsx) |
| `/dashboard/delivery` | Page  | Layout/proxy or public | [source](../../app/(dashboard)/dashboard/delivery/page.tsx) |
| `/dashboard/mortgage` | Page  | Layout/proxy or public | [source](../../app/(dashboard)/dashboard/mortgage/page.tsx) |
| `/dashboard/notes` | Page  | Layout/proxy or public | [source](../../app/(dashboard)/dashboard/notes/page.tsx) |
| `/dashboard` | Page  | Layout/proxy or public | [source](../../app/(dashboard)/dashboard/page.tsx) |
| `/dashboard/partners` | Page  | Layout/proxy or public | [source](../../app/(dashboard)/dashboard/partners/page.tsx) |
| `/dashboard/properties` | Page  | Layout/proxy or public | [source](../../app/(dashboard)/dashboard/properties/page.tsx) |
| `/dashboard/settings` | Page  | Layout/proxy or public | [source](../../app/(dashboard)/dashboard/settings/page.tsx) |
| `/dashboard/tasks` | Page  | Layout/proxy or public | [source](../../app/(dashboard)/dashboard/tasks/page.tsx) |
| `/dashboard/voice-scripts` | Page  | Layout/proxy or public | [source](../../app/(dashboard)/dashboard/voice-scripts/page.tsx) |
| `/acceptable-use` | Page  | Layout/proxy or public | [source](../../app/acceptable-use/page.tsx) |
| `/api/activity/insights` | API POST | Direct requireUserId | [source](../../app/api/activity/insights/route.ts) |
| `/api/activity/priorities` | API GET | Direct requireUserId | [source](../../app/api/activity/priorities/route.ts) |
| `/api/activity` | API GET/POST | Direct requireUserId | [source](../../app/api/activity/route.ts) |
| `/api/ai/generate` | API POST | Direct requireUserId | [source](../../app/api/ai/generate/route.ts) |
| `/api/analytics` | API GET | Direct requireUserId | [source](../../app/api/analytics/route.ts) |
| `/api/automations` | API GET/POST | Direct requireUserId | [source](../../app/api/automations/route.ts) |
| `/api/automations/rules` | API GET/POST/DELETE | Direct requireUserId | [source](../../app/api/automations/rules/route.ts) |
| `/api/billing/add-payment-method` | API POST | Direct requireUserId | [source](../../app/api/billing/add-payment-method/route.ts) |
| `/api/billing/checkout` | API POST | Direct requireUserId | [source](../../app/api/billing/checkout/route.ts) |
| `/api/billing/checkout-public` | API POST | Public or separately gated — inspect handler | [source](../../app/api/billing/checkout-public/route.ts) |
| `/api/billing/claim` | API POST/GET | Direct requireUserId | [source](../../app/api/billing/claim/route.ts) |
| `/api/billing/portal` | API POST | Direct requireUserId | [source](../../app/api/billing/portal/route.ts) |
| `/api/billing/start-trial` | API POST | Direct requireUserId | [source](../../app/api/billing/start-trial/route.ts) |
| `/api/calendar/book/[token]` | API GET/POST/DELETE | Scoped public token | [source](../../app/api/calendar/book/[token]/route.ts) |
| `/api/calendar/booking-requests` | API GET/POST | Direct requireUserId | [source](../../app/api/calendar/booking-requests/route.ts) |
| `/api/calendar/events/[eventId]` | API PATCH/DELETE | Direct requireUserId | [source](../../app/api/calendar/events/[eventId]/route.ts) |
| `/api/calendar/events` | API GET/POST | Direct requireUserId | [source](../../app/api/calendar/events/route.ts) |
| `/api/calendar/external` | API PATCH/DELETE | Direct requireUserId | [source](../../app/api/calendar/external/route.ts) |
| `/api/calendar/feed/[token]` | API GET | Scoped public token | [source](../../app/api/calendar/feed/[token]/route.ts) |
| `/api/calendar/links` | API GET/POST/DELETE | Direct requireUserId | [source](../../app/api/calendar/links/route.ts) |
| `/api/calendar/preferences` | API GET/PUT | Direct requireUserId | [source](../../app/api/calendar/preferences/route.ts) |
| `/api/campaign-attachments/signed-upload` | API POST | Direct requireUserId | [source](../../app/api/campaign-attachments/signed-upload/route.ts) |
| `/api/campaigns/[campaignId]/recipients` | API POST/DELETE | Direct requireUserId | [source](../../app/api/campaigns/[campaignId]/recipients/route.ts) |
| `/api/campaigns/[campaignId]` | API GET/PATCH | Direct requireUserId | [source](../../app/api/campaigns/[campaignId]/route.ts) |
| `/api/campaigns/[campaignId]/run-due` | API POST | Direct requireUserId | [source](../../app/api/campaigns/[campaignId]/run-due/route.ts) |
| `/api/campaigns/[campaignId]/send` | API POST | Direct requireUserId | [source](../../app/api/campaigns/[campaignId]/send/route.ts) |
| `/api/campaigns/[campaignId]/test-run` | API POST | Direct requireUserId | [source](../../app/api/campaigns/[campaignId]/test-run/route.ts) |
| `/api/campaigns/builder` | API POST | Direct requireUserId | [source](../../app/api/campaigns/builder/route.ts) |
| `/api/campaigns/from-template` | API POST | Direct requireUserId | [source](../../app/api/campaigns/from-template/route.ts) |
| `/api/campaigns/library/[campaignId]` | API GET | Direct requireUserId | [source](../../app/api/campaigns/library/[campaignId]/route.ts) |
| `/api/campaigns/library` | API GET | Direct requireUserId | [source](../../app/api/campaigns/library/route.ts) |
| `/api/campaigns/preview` | API POST | Direct requireUserId | [source](../../app/api/campaigns/preview/route.ts) |
| `/api/campaigns` | API GET/POST | Direct requireUserId | [source](../../app/api/campaigns/route.ts) |
| `/api/campaigns/runner` | API POST/GET | Worker bearer secret — inspect handler | [source](../../app/api/campaigns/runner/route.ts) |
| `/api/communications` | API GET/PATCH | Direct requireUserId | [source](../../app/api/communications/route.ts) |
| `/api/compliance/audit` | API GET | Direct requireUserId | [source](../../app/api/compliance/audit/route.ts) |
| `/api/contact` | API POST | Public or separately gated — inspect handler | [source](../../app/api/contact/route.ts) |
| `/api/contacts/[id]/calls` | API POST | Direct requireUserId | [source](../../app/api/contacts/[id]/calls/route.ts) |
| `/api/contacts/[id]` | API GET/PATCH/DELETE | Direct requireUserId | [source](../../app/api/contacts/[id]/route.ts) |
| `/api/contacts/[id]/tasks/[taskId]` | API PATCH/DELETE | Delegated/custom — inspect source | [source](../../app/api/contacts/[id]/tasks/[taskId]/route.ts) |
| `/api/contacts/[id]/tasks` | API GET/POST | Direct requireUserId | [source](../../app/api/contacts/[id]/tasks/route.ts) |
| `/api/contacts/[id]/timeline` | API GET | Direct requireUserId | [source](../../app/api/contacts/[id]/timeline/route.ts) |
| `/api/contacts/bulk` | API POST | Direct requireUserId | [source](../../app/api/contacts/bulk/route.ts) |
| `/api/contacts/categories` | API GET/POST | Direct requireUserId | [source](../../app/api/contacts/categories/route.ts) |
| `/api/contacts/import` | API POST | Direct requireUserId | [source](../../app/api/contacts/import/route.ts) |
| `/api/contacts/relationship-pulse/enroll` | API POST | Direct requireUserId | [source](../../app/api/contacts/relationship-pulse/enroll/route.ts) |
| `/api/contacts/relationship-pulse` | API GET | Direct requireUserId | [source](../../app/api/contacts/relationship-pulse/route.ts) |
| `/api/contacts` | API GET/POST | Direct requireUserId | [source](../../app/api/contacts/route.ts) |
| `/api/dashboard/briefing/preferences` | API PUT | Direct requireUserId | [source](../../app/api/dashboard/briefing/preferences/route.ts) |
| `/api/dashboard/briefing` | API GET/POST | Direct requireUserId | [source](../../app/api/dashboard/briefing/route.ts) |
| `/api/dashboard/briefing/runner` | API GET | Worker bearer secret — inspect handler | [source](../../app/api/dashboard/briefing/runner/route.ts) |
| `/api/delivery/reconcile` | API POST | Direct requireUserId | [source](../../app/api/delivery/reconcile/route.ts) |
| `/api/delivery` | API GET | Direct requireUserId | [source](../../app/api/delivery/route.ts) |
| `/api/engagement` | API GET/POST | Direct requireUserId | [source](../../app/api/engagement/route.ts) |
| `/api/financing/context` | API GET | Direct requireUserId | [source](../../app/api/financing/context/route.ts) |
| `/api/financing/partners` | API GET/POST/DELETE | Direct requireUserId | [source](../../app/api/financing/partners/route.ts) |
| `/api/financing/reports` | API GET/POST | Direct requireUserId | [source](../../app/api/financing/reports/route.ts) |
| `/api/health/db` | API GET | Direct requireUserId | [source](../../app/api/health/db/route.ts) |
| `/api/health` | API GET | Public or separately gated — inspect handler | [source](../../app/api/health/route.ts) |
| `/api/integrations/dotloop/callback` | API GET | Direct requireUserId | [source](../../app/api/integrations/dotloop/callback/route.ts) |
| `/api/integrations/dotloop/connect` | API GET | Direct requireUserId | [source](../../app/api/integrations/dotloop/connect/route.ts) |
| `/api/integrations/dotloop/status` | API GET/DELETE | Direct requireUserId | [source](../../app/api/integrations/dotloop/status/route.ts) |
| `/api/integrations/google/authorize` | API GET | Direct requireUserId | [source](../../app/api/integrations/google/authorize/route.ts) |
| `/api/integrations/google/callback` | API GET | Direct requireUserId | [source](../../app/api/integrations/google/callback/route.ts) |
| `/api/integrations/google/status` | API GET/DELETE | Direct requireUserId | [source](../../app/api/integrations/google/status/route.ts) |
| `/api/integrations/status` | API GET | Direct requireUserId | [source](../../app/api/integrations/status/route.ts) |
| `/api/marketing/attribution` | API POST | Direct requireUserId | [source](../../app/api/marketing/attribution/route.ts) |
| `/api/marketing/playbook` | API POST | Delegated/custom — inspect source | [source](../../app/api/marketing/playbook/route.ts) |
| `/api/mortgage/market-rates` | API GET | Public or separately gated — inspect handler | [source](../../app/api/mortgage/market-rates/route.ts) |
| `/api/mortgage/rates` | API GET | Public or separately gated — inspect handler | [source](../../app/api/mortgage/rates/route.ts) |
| `/api/notes/[id]` | API PATCH/DELETE | Direct requireUserId | [source](../../app/api/notes/[id]/route.ts) |
| `/api/notes/[id]/tasks` | API POST | Direct requireUserId | [source](../../app/api/notes/[id]/tasks/route.ts) |
| `/api/notes/[id]/versions` | API GET | Direct requireUserId | [source](../../app/api/notes/[id]/versions/route.ts) |
| `/api/notes/assist` | API POST | Direct requireUserId | [source](../../app/api/notes/assist/route.ts) |
| `/api/notes/planner` | API GET | Direct requireUserId | [source](../../app/api/notes/planner/route.ts) |
| `/api/notes` | API GET/POST | Direct requireUserId | [source](../../app/api/notes/route.ts) |
| `/api/notes/transcribe` | API POST | Direct requireUserId | [source](../../app/api/notes/transcribe/route.ts) |
| `/api/notes/workspace` | API GET/POST | Direct requireUserId | [source](../../app/api/notes/workspace/route.ts) |
| `/api/partners/invitations` | API POST/PATCH | Direct requireUserId | [source](../../app/api/partners/invitations/route.ts) |
| `/api/partners` | API GET/POST/DELETE | Direct requireUserId | [source](../../app/api/partners/route.ts) |
| `/api/partners/shared-assets` | API POST/PATCH | Direct requireUserId | [source](../../app/api/partners/shared-assets/route.ts) |
| `/api/property-finder/history` | API GET/POST | Direct requireUserId | [source](../../app/api/property-finder/history/route.ts) |
| `/api/providers/status` | API GET | Direct requireUserId | [source](../../app/api/providers/status/route.ts) |
| `/api/settings/brand-kit/assets` | API POST | Direct requireUserId | [source](../../app/api/settings/brand-kit/assets/route.ts) |
| `/api/settings/brand-kit/assist` | API POST | Direct requireUserId | [source](../../app/api/settings/brand-kit/assist/route.ts) |
| `/api/settings/brand-kit` | API GET | Direct requireUserId | [source](../../app/api/settings/brand-kit/route.ts) |
| `/api/settings/onboarding` | API GET | Direct requireUserId | [source](../../app/api/settings/onboarding/route.ts) |
| `/api/settings` | API GET/POST | Direct requireUserId | [source](../../app/api/settings/route.ts) |
| `/api/tasks/ai` | API POST | Delegated/custom — inspect source | [source](../../app/api/tasks/ai/route.ts) |
| `/api/tasks/checklists` | API POST | Delegated/custom — inspect source | [source](../../app/api/tasks/checklists/route.ts) |
| `/api/tasks/preferences` | API GET/POST | Delegated/custom — inspect source | [source](../../app/api/tasks/preferences/route.ts) |
| `/api/tasks/proposals` | API POST | Delegated/custom — inspect source | [source](../../app/api/tasks/proposals/route.ts) |
| `/api/tasks` | API GET/POST | Direct requireUserId | [source](../../app/api/tasks/route.ts) |
| `/api/tasks/templates` | API GET/POST | Delegated/custom — inspect source | [source](../../app/api/tasks/templates/route.ts) |
| `/api/tasks/transactions` | API PATCH | Delegated/custom — inspect source | [source](../../app/api/tasks/transactions/route.ts) |
| `/api/tasks/workspace` | API GET/POST/DELETE | Delegated/custom — inspect source | [source](../../app/api/tasks/workspace/route.ts) |
| `/api/voice-assets/[id]` | API PATCH/DELETE | Direct requireUserId | [source](../../app/api/voice-assets/[id]/route.ts) |
| `/api/voice-assets/approve` | API POST | Direct requireUserId | [source](../../app/api/voice-assets/approve/route.ts) |
| `/api/voice-assets/clone` | API POST | Direct requireUserId | [source](../../app/api/voice-assets/clone/route.ts) |
| `/api/voice-assets/profiles` | API GET/POST | Direct requireUserId | [source](../../app/api/voice-assets/profiles/route.ts) |
| `/api/voice-assets` | API GET | Direct requireUserId | [source](../../app/api/voice-assets/route.ts) |
| `/api/voice-assets/signed-upload` | API POST | Direct requireUserId | [source](../../app/api/voice-assets/signed-upload/route.ts) |
| `/api/voice-assets/synthesize` | API POST | Direct requireUserId | [source](../../app/api/voice-assets/synthesize/route.ts) |
| `/api/voice-studio/capabilities` | API GET | Direct requireUserId | [source](../../app/api/voice-studio/capabilities/route.ts) |
| `/api/voice-studio/drafts` | API GET/PUT | Direct requireUserId | [source](../../app/api/voice-studio/drafts/route.ts) |
| `/api/voice-studio/transcribe` | API POST | Direct requireUserId | [source](../../app/api/voice-studio/transcribe/route.ts) |
| `/api/voice-studio/transcripts` | API GET/POST | Direct requireUserId | [source](../../app/api/voice-studio/transcripts/route.ts) |
| `/api/voice-studio/write` | API POST | Direct requireUserId | [source](../../app/api/voice-studio/write/route.ts) |
| `/api/webhooks/delivery/[provider]` | API POST | Provider signature/secret — inspect handler | [source](../../app/api/webhooks/delivery/[provider]/route.ts) |
| `/api/webhooks/stripe` | API POST/GET | Provider signature/secret — inspect handler | [source](../../app/api/webhooks/stripe/route.ts) |
| `/api/webhooks/twilio/calls` | API POST | Provider signature/secret — inspect handler | [source](../../app/api/webhooks/twilio/calls/route.ts) |
| `/api/webhooks/twilio/sms` | API POST | Provider signature/secret — inspect handler | [source](../../app/api/webhooks/twilio/sms/route.ts) |
| `/api/webhooks/voice` | API POST/GET | Provider signature/secret — inspect handler | [source](../../app/api/webhooks/voice/route.ts) |
| `/book/[token]` | Page  | Layout/proxy or public | [source](../../app/book/[token]/page.tsx) |
| `/checkout` | Page  | Layout/proxy or public | [source](../../app/checkout/page.tsx) |
| `/contact` | Page  | Layout/proxy or public | [source](../../app/contact/page.tsx) |
| `/crm-for-small-business` | Page  | Layout/proxy or public | [source](../../app/crm-for-small-business/page.tsx) |
| `/dpa` | Page  | Layout/proxy or public | [source](../../app/dpa/page.tsx) |
| `/features/[slug]` | Page  | Layout/proxy or public | [source](../../app/features/[slug]/page.tsx) |
| `/features` | Page  | Layout/proxy or public | [source](../../app/features/page.tsx) |
| `/lead-follow-up` | Page  | Layout/proxy or public | [source](../../app/lead-follow-up/page.tsx) |
| `/lead-reactivation` | Page  | Layout/proxy or public | [source](../../app/lead-reactivation/page.tsx) |
| `/` | Page  | Layout/proxy or public | [source](../../app/page.tsx) |
| `/playbook` | Page  | Layout/proxy or public | [source](../../app/playbook/page.tsx) |
| `/pricing` | Page  | Layout/proxy or public | [source](../../app/pricing/page.tsx) |
| `/privacy` | Page  | Layout/proxy or public | [source](../../app/privacy/page.tsx) |
| `/real-estate-crm` | Page  | Layout/proxy or public | [source](../../app/real-estate-crm/page.tsx) |
| `/realtor-lead-follow-up` | Page  | Layout/proxy or public | [source](../../app/realtor-lead-follow-up/page.tsx) |
| `/refunds` | Page  | Layout/proxy or public | [source](../../app/refunds/page.tsx) |
| `/resources/[slug]` | Page  | Layout/proxy or public | [source](../../app/resources/[slug]/page.tsx) |
| `/resources` | Page  | Layout/proxy or public | [source](../../app/resources/page.tsx) |
| `/sms-consent` | Page  | Layout/proxy or public | [source](../../app/sms-consent/page.tsx) |
| `/tcpa-consent` | Page  | Layout/proxy or public | [source](../../app/tcpa-consent/page.tsx) |
| `/terms` | Page  | Layout/proxy or public | [source](../../app/terms/page.tsx) |
