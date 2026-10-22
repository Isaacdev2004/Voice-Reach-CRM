# AI assistant response fixes

Branch: `fix/ai-task-output`. Target: `main`. Review only; do not merge or deploy to production until staging verification is complete.

## Findings and changes

The existing application already requested JSON and had partial parsing/rendering support. Its validator could accept malformed fenced JSON as an email body and coerce invalid summary values into text. Provider failures could silently turn into template responses, and the browser did not reliably validate the returned task. Email results were not editable, and reopening the assistant could retain an earlier contact's brief.

- Validate structured responses against each task on both server and client. Reject malformed, empty, truncated, incomplete and wrong-task outputs; strip unknown/debug fields. Keep the existing campaign outbound parser unchanged.
- Require an email subject and complete body; strengthen professional real estate drafting instructions and distinguish email/SMS requests from recommendations. Explicit draft requests in general suggestion mode select the corresponding draft task.
- Provide editable email subject/body and SMS text. Copy uses the current validated edits. Preserve existing modal styling, campaign actions and other AI tasks.
- Bound provider requests to 25 seconds and browser requests to 35 seconds. Cancel and ignore stale requests when tasks, contacts or sessions change. Show fixed, friendly errors rather than provider payloads, stack traces or raw JSON.
- Read saved contact context using both contact ID and authenticated owner ID. Use only the selected contact's authorized name/notes, and keep prompts, notes and generated text out of audit logs. Missing details use neutral language rather than invented contact facts.
- Keep the existing no-key template mode, explicitly labeled in the UI. A configured provider's failure no longer silently returns a template.

No database schema, billing, consent, sending, authentication, route permissions or CRM record changes are included. Drafting does not send messages.

## Verification

- `npm run test:unit`: passed, including 12 new AI regression tests covering email, SMS, recommendations, malformed JSON, empty/failed responses, missing contact information, owner-scoped context and API error redaction.
- `npm run test:security`: passed.
- `npm run lint`: passed with 9 pre-existing warnings in unrelated files (fonts, images, hooks and an ARIA attribute).
- `npm run build` and `npx tsc --noEmit --pretty false`: passed.
- Chromium checks against the real assistant components with synthetic data and intercepted API fixtures: 12 passed; no page errors. Covered editing/copying, invalid edits, task output rendering, safe failures, task-switch cancellation, timeout, fresh-session reset and mobile overflow at 390px. These are component checks, not authenticated staging or live-provider verification.

Screenshots show the updated assistant with synthetic contact data:

- [Desktop email editor](ai-review/email-desktop.png)
- [Mobile email editor](ai-review/email-mobile.png)
- [Browser check results](ai-review/results.json)

## Staging review

A PR preview is an isolated test deployment of this branch, separate from `www.myari.io`. Preview availability depends on the repository's hosting configuration. No staging URL or authenticated test session has been supplied yet, so authenticated staging and live-provider checks remain pending.

1. Open this PR's non-production preview, if one is created, and sign in with an authorized test account.
2. Use synthetic contacts to draft an email and SMS; verify subject/body, edit/copy and appropriate personalization. Request an email from general follow-up mode too.
3. Generate a follow-up recommendation, note summary, voicemail and campaign idea; verify existing campaign save/activate controls remain present without activating a live campaign.
4. Switch contacts/tasks while generating, then close and reopen. Verify old drafts and briefs do not appear.
5. Check desktop and 390px mobile layouts, keyboard focus and dialog scrolling.
6. Use controlled provider failure fixtures in an isolated test setup to check malformed/empty output and timeouts. Never expose provider secrets or customer data in screenshots.
7. Record staging results on the PR before approving production deployment.
