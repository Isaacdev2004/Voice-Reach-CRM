# Voice Studio repair and premium workspace QA — 2026-10-23

## 1. Cloud-draft root cause: confirmed defects versus production uncertainty

The old drafts route required the optional `voice_script_drafts` migration and returned an unavailable response for any database error. The Create Script component showed the reported generic banner for all load failures, so the banner alone did not distinguish missing schema, permissions, authentication or network failure.

Confirmed and reproduced code defects:

- No autosave or durable recovery: unsaved text existed only in React state and was reset after refresh, navigation or reopening Create Script.
- Manual Save accepted HTTP success without validating the returned persisted record.
- Draft updates had no revision precondition, allowing a stale editor to overwrite another session.
- Script selection/new-draft actions could replace unsaved editor state.
- AI voice generation did not pass the active draft ID, so generated versions did not appear under the intended script.
- Recording dialog dismissal discarded pending audio; pending audio now remains available to retry or download.

A metadata-only request, filtered to a synthetic owner with zero returned rows, could not reach the configured database (`status: 0`, connection unavailable, no database schema error code). Therefore **the specific production cause of the subscriber's banner remains unverified**. No production subscriber records, environment settings, credentials or database schema were changed during QA. Do not report that a production migration was confirmed missing or applied.

## 2. Persistence repair

`lib/voice-studio/drafts-store.ts` uses the existing owner-scoped drafts table when available. Only recognized missing-table/column errors allow secure fallback to private document rows in the existing `audit_logs` table, with action `VOICE_SCRIPT_DRAFT_DOCUMENT`. Permission and network failures never activate fallback. Fallback documents remain readable and editable after the dedicated table is installed. They are excluded from the business activity feed. No new production migration is needed for this fallback.

Draft responses contain validated IDs, content and revision tokens. Client requests also carry an expected-account guard so an account switch cannot submit an old editor into a new session. Updates compare the authenticated owner, ID and previous revision; conflicting edits return HTTP 409 without overwriting the stored draft. Retried identical saves are idempotent. The existing database primary key prevents conflicting foreign IDs from transferring ownership. Both stores are read with owner filters and pagination; duplicate cross-store IDs fail closed for review.

`use-voice-drafts.ts` maintains per-owner device recovery plus per-tab journals, debounced autosave, manual retry, conflict/save-as-copy controls and text downloads. Empty unfinished titles remain recoverable even though cloud saves require a valid title. In-flight saves cannot replace newer typing or confirm a different selected draft. Recovery is distinct from server-confirmed saving; only a matching validated server response or cloud read establishes Saved. Recovery-only library entries never infer cloud status from an old revision token, and late responses after unmount cannot overwrite a reopened editor. Storage-quota failures are visible; replacing an unsaved draft is blocked when device recovery cannot be written. Before-unload warnings protect unsaved text/audio. Recovery stores potentially sensitive scripts on the subscriber's device under account-specific keys; it is not a substitute for cloud persistence or a shared-device security boundary.

## 3. Visual refinements

- The approved library hero, imagery and exact Voice Scripts copy remain unchanged.
- Create mode has a compact branded header and back-to-library navigation instead of the large photo hero.
- The editor is wider, with recording immediately below it; the script library can be collapsed.
- AI writing and voice settings share a contextual panel. Transcript comparison is a compact disclosure.
- Save Draft, Download Draft and Test Voice Script remain near the title. Phone/tablet/narrow-window layouts stack cleanly; full-width controls and reduced-motion behavior are preserved.

## 4. AI assistant audit

The existing Anthropic writing endpoint is reused. Authenticated capabilities expose configuration booleans only. Missing configuration disables generation with useful guidance. Improve Tone, Shorten, Translate, Personalize, Optimize Duration and Spoken-Friendly Wording prepare reviewable prompts; translation/personalization require the subscriber to replace target-language/client-detail instructions before generation. Quick starts cover buyer re-engagement, showing follow-up, past clients and sellers without fabricated facts.

AI results remain proposals until explicitly applied. Suggestions are tied to their originating draft; replacing text edited since the request requires confirmation. Script limits and variable insertion bounds are enforced. Approved audio/script metadata is not overwritten. Real provider configuration, billing and generation were not exercised; provider tests are synthetic.

## 5. Transcription availability and review

An existing OpenAI Whisper transcription path is available in the Notes implementation. The new Voice Studio endpoint reuses it after checking the authenticated owner, recording ID, private storage prefix, consent, supported file signature and 20 MB bound. It does not accept arbitrary external audio URLs. An explicit subscriber confirmation precedes external processing. Provider availability depends on the production `OPENAI_API_KEY`; actual production configuration is unverified.

The UI distinguishes original script, AI draft transcript, editable review and the exact approved/unapproved recording. Text comparison reports differences without claiming audio accuracy or inventing transcripts. Agent-reviewed transcript snapshots are saved separately in owner-scoped audit records and reloaded; existing approved recordings remain immutable. Consent to process audio and transcript review are separate actions. No real customer audio was sent to a provider in QA.

## 6. Recording and approval

Browser microphone denial, recording, pause/resume, stop, failed upload retention, playback and measured duration were tested with synthetic media. Pending audio can be retried/downloaded after dismissing its naming dialog; leaving with unsaved audio warns. Each successful upload/generation remains a separate asset. Human recording script context is captured when recording starts. AI synthesis now passes the actual draft ID and selects the new unapproved asset, preserving existing versions.

Approval continues to require explicit review and owned stored audio with a supported signature. Editing content on an approved asset is rejected. Metadata edits include an approval-state precondition so an edit that races with approval cannot overwrite newly approved content. Version history includes the selected recording's original group as well as the active text draft. No production audio version was approved, replaced or deleted during QA.

## 7. Campaign assignment

Subscribers select campaign, exact voicemail step and approved recording version. Existing assignments are labeled and replacement requires confirmation, now enforced server-side for existing assignments as well as live campaigns. Owner, campaign and voicemail-step relationships are checked. Known Slybroadcast assignments reject unsupported WebM/Ogg containers and request an MP3/WAV/M4A version; existing source audio remains available. Recording format checks do not certify provider acceptance or recipient eligibility.

The existing outbound consent/suppression, provider scheduling, live-send gates and campaign-default inheritance behavior are retained. Assigning audio never grants recipient consent or activates a campaign. QA used mock assignments only and created no live schedules, enrollments or communications.

## 8. Test results

- Lint passes with the same seven unrelated existing warnings; no new warnings.
- TypeScript and production build pass.
- Full `test:unit` and security checks pass.
- Voice draft/API tests cover persistence, retry deduplication, concurrent conflicts, migration fallback and later migration visibility, tenant isolation, malformed validation, network/permission failures, transcription authorization, reviewed transcript persistence, approval protection, AI recording versioning and confirmed exact-step assignment.
- Real PostgreSQL-compatible PGlite tests pass for migrations, draft primary-key collision, conditional updates, stale/foreign writes and browser-role denial, alongside the existing Studio database regression checks.
- Comprehensive actual-component browser tests pass at **1920, 1536, 1440, 1280, 1100, 768 and 390px**, covering autosave/manual save, refresh/reopening, failed saves, malformed acknowledgements, unfinished titles, in-flight typing, conflicts/save-as-copy, AI proposal review, transcription review, confirmed assignment, account switching and no overflow/browser errors. External services and recordings are mocked.
- Existing Studio/Activity/Settings browser regressions pass at their five standard viewports. A final 1440/390px targeted run additionally confirms exact script text and reviewed transcript persistence after closing and reopening.

### Review captures (synthetic data only)

| View | Before | After |
| --- | --- | --- |
| Create Script, 1536px | [Before](voice-studio-repair-review/before/voice-create-1536.png) | [After](voice-studio-repair-review/after/voice-create-1536.png) |
| Create Script, 390px | [Before](voice-studio-repair-review/before/voice-create-390.png) | [After](voice-studio-repair-review/after/voice-create-390.png) |

[Browser assertions](voice-studio-repair-review/after/browser-results.json) · [Final targeted assertions](voice-studio-repair-review/final/browser-results.json)

## 9. Changed areas and remaining errors

UI: `VoiceScriptsStudioPage`, `VoiceStudioWorkspace`, Voice Studio CSS, `RecordingTranscript`, and the shared voice settings strip. Services: drafts schema/store/recovery hook, drafts/capabilities/transcription/review routes, recording metadata approval-state guard, campaign assignment validation and private-document activity filtering. Tests: draft/API regression tests, database assertions, existing browser fixture compatibility and dedicated seven-viewport repair QA.

No failing automated checks remain at delivery. Production database/schema/permissions and authenticated cloud-save smoke testing remain unverified because the audit environment could not connect. Live microphone/device codecs, real Anthropic/OpenAI/ElevenLabs responses and provider delivery acceptance still require authorized production/staging verification. The existing `voice_assets.studio_metadata` migration remains required for audio script/approval metadata; the draft fallback does not create or migrate audio schema. Transcription supports up to 20 MB, while audio storage accepts up to 25 MB; the UI/API explain the transcription limit.

## 10. Production readiness and release

The tested code is releasable without an automatic schema or credential change. **This is not a certification that production cloud saving or providers are operational.** The user authorized automatic deployment for this task. Release through a non-draft PR, exact-head green CI/preview, merge to main and verification of Vercel's production deployment status. No unrelated unmerged PR should be included. Rollback is the previous Vercel deployment or a revert; recovery copies and existing recordings remain separate from deployment artifacts.

## Follow-up: campaign overlay and Calendar preference banner

The campaign drawer used z-index 10010 while shared dialogs used 10000. Test Voice Script therefore opened behind the drawer. Shared dialogs now render above it; the drawer yields keyboard handling to the last dialog. Actual-component browser regressions passed at 1440, 1920, 768 and 390px: hit testing confirms the voice dialog is unobscured, Tab stays within it, Escape closes only the test, focus returns to its trigger, and the underlying drawer retains scroll lock.

Calendar's screenshot banner previously treated every preferences failure as a possible concurrent-edit conflict. The API now returns distinct safe codes for missing `save_calendar_preferences` RPC, genuine stale revisions, temporary failures and unconfirmed save acknowledgements. The UI maps those codes to safe instructions, validates success and clears stale failure notices after a successful retry. No database errors or secrets reach subscribers. All 24 Calendar service tests pass, including authenticated owner/version propagation and new setup/outage/empty-acknowledgement regressions.

**Calendar production saving is not yet verified or claimed repaired.** The existing function is defined in `supabase/migrations/20261023020000_calendar_workspace.sql`. Deployment of application code does not itself apply Supabase migrations. An authorized database administrator must verify migration history and function availability, test the migration in staging if missing, and apply through the normal database release process. Do not blindly reapply the entire migration against production. If the RPC exists, inspect the failing PUT's safe error code and server-side database diagnostics instead. No production schema or calendar records were modified.
