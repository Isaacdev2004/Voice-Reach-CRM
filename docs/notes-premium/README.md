# Notes & Strategy workspace — review report

Development branch: `feature/notes-planner-workspace`, based on the Calendar / Phase 18 work. Prepared for GitHub review-branch publication. No production migration, deployment, real recording, or production note edits were performed for this implementation.

## Visual changes

The supplied Notes preview guides the compact botanical hero, champagne controls, note library, central editor, and right-hand planner/context panels. The written header takes precedence over the reference's sample headline: **NOTES & STRATEGY / Great outcomes begin with a plan. / Capture insights, organize ideas, and turn strategy into action.** Existing logo, tagline, navigation, and account controls remain. The new generated botanical courtyard-office photograph is decorative brand imagery, not an advertised listing or reuse from another tab.

Desktop displays three columns. Tablet and mobile use accessible panel switches and internally scrolling categories, with primary note actions kept visible. The reference's sample contacts, property comparables, and planner statistics are not included. Property thumbnails/comparables are omitted because no authorized listing inventory exists.

## Editor and organization

- Working title, category, custom tags, server-persisted pins, recent/title/oldest sorting, full-text/contact/property search, combined tag/contact/category filters, clear filters, and owner-scoped session view memory.
- Plain-text/Markdown storage preserves existing notes. The formatting toolbar inserts bold, italic, headings, lists, links, and checklists; safe formatted preview supports checkbox editing. This is a Markdown-backed editor, not a full WYSIWYG or arbitrary HTML editor. No HTML is executed.
- Multiple contacts use stable UUID associations. `@` opens real contact suggestions; choosing one adds a record-ID association rather than relying on the displayed name. Contact search uses name/email. Notes appear in each linked contact's existing timeline and Notes panel.
- Properties are explicitly **saved contact property addresses**, linked by that owned contact's stable ID. There is no invented independent property database. Property Finder links load only authorized matching contacts; campaign navigation opens the actual library without automatic enrollment.
- Eleven original blank MyARI planner/consultation templates; editable copies, duplication, saved custom templates, and reuse. Existing global browser-only pins are not assigned to an account automatically; agents can re-pin owned notes in the new server-backed workspace.
- Notes remain private to the subscriber. No new public sharing endpoint or fake Share action is introduced.

## Saving and versions

The new workspace save route calls an atomic PostgreSQL function with an authenticated owner, client creation UUID, and expected revision. Updates lock and compare revisions, archive the previous version, and reject differing stale writes. Repeated creation requests cannot overwrite a newer note. Legacy edit routes also compare the revision read before writing, and database triggers archive those edits.

Save status reports unsaved/saving/saved/error/conflict. Saves are serialized, including edits made during an in-flight save. Navigation flushes pending edits; before-unload protection and owner-scoped local draft recovery protect failures. Recovery requires review and saves a new note rather than overwriting a newer server version. Recovery is available for seven days on that browser; expired drafts are removed on the next workspace visit. Saved drafts are removed from browser recovery storage. Private notes and version history remain server-side until the note is deleted; deletion cascades history, while previously approved tasks remain with their source link cleared.

History returns up to 50 previous snapshots. Restoring preserves the current revision as a new history entry rather than rewriting the old entry. Database persistence is designed for multiple sessions/devices; real staging cross-device behavior still needs verification.

## Dictation and authorized audio

Browser SpeechRecognition/webkitSpeechRecognition supports explicit start, stop, pause (stop capture), resume (a new recognition session), interim text, editable transcript, microphone denial/no-speech handling, and an unsupported-browser fallback. Browser speech providers may process microphone audio. No microphone starts automatically and no phone-call recording is initiated.

The original transcript is separate from corrected text and AI summaries, including across pause/resume. Save Transcript adds editable text to the note and retains the original. Summarize & Suggest Actions opens a separate review workflow. Low-confidence provider segments are marked for review; accuracy is never assumed.

Existing voice assets are outbound voicemail/script recordings. No verified incoming/live-call recording or transcript integration was found, so they are not relabeled as calls. Agents can dictate/type a post-call recap or upload an authorized audio file. Uploads require explicit authorization/all-required-participant-consent confirmation, including all-party consent where applicable. The server validates auth, consent, type, nonempty size (20 MB cap including bounded stream handling), and timeout. Upload transcription uses OpenAI Whisper only when configured; MyARI does not store uploaded audio. Provider retention policy still applies. Saved transcripts inherit note deletion/version behavior. Consent confirmation is an agent attestation, not an independent legal verification.

## AI summaries and approval (including Phase 16)

The dedicated Notes endpoint uses the existing Anthropic integration style, never the generic deterministic template fallback. It bounds input, applies a timeout, validates structured output, requires exact source quotes for fact/action evidence, and returns safe errors on unavailable/malformed/empty responses. It does not log note or provider response bodies. Quotes establish traceability, **not semantic proof**; overview, extracted details, and drafts remain explicitly unverified until the agent reviews them.

Actions include summary, writing improvement, task extraction, follow-ups, meeting organization, buyer/seller summaries, follow-up drafts, campaign ideas, and agendas. No AI result updates a contact, sends a message, or enrolls a campaign. The editable review distinguishes overview, discussion, preferences, decisions, commitments, clarification questions, and suggested next actions. Missing evidence produces empty sections rather than invented facts/dates. Original source is available alongside evidence excerpts.

An agent selects an individual suggestion, edits it, and explicitly opens task review. Opening task review saves the edited summary to its source note; a nested dialog keeps the AI review state available if task creation is canceled or completed. Task creation requires its own explicit confirmation. The database enforces owner/note/contact/property checks and a unique note/action UUID to prevent retry/double-click duplicates. Due dates are agent-entered, never inferred. Tasks include description, priority, optional contact/property, and optional existing-calendar reminder. Tasks appear in Tasks and contact timelines; Tasks links back to the source note. Existing calendar/task mirror deduplication is retained.

## Realtor Planner

Daily, weekly, and monthly views read real task records and the existing Calendar read model. No calendar/task rows are cloned. Appointments exclude mirrored task entries. Deadline priorities can be reordered by drag/drop or keyboard-accessible move controls; the ordering is saved with the current note. Calendar limitations are reported rather than presented as a complete verified provider view. Templates provide editable goals, checklists, deadlines, and reflection sections. Related tasks refresh after approved creation.

## Validation and evidence

See [QA results](qa-results.md), [browser results](browser-results.json), and [changed files](changed-files.txt).

Screenshots use synthetic owned records and an isolated HTTP fixture backend, with actual React components and dashboard shell. They do not demonstrate production subscriber data or live AI/transcription/provider authentication:

- [Desktop 1440](notes-1440.png) / [Desktop 1920](notes-1920.png)
- [Tablet 768](notes-768.png) / [Tablet context](notes-context-768.png)
- [Mobile 390](notes-390.png) / [Mobile context](notes-context-390.png)

## Staging setup and remaining limitations

1. Review and apply `supabase/migrations/20261023030000_notes_workspace.sql` to an isolated staging database after existing Contacts, Tasks, Notes, and Calendar prerequisites. It adds metadata, revision/client keys, history, task-source fields, and service-role-only functions; it revokes direct anonymous/authenticated table access to private notes. Do not apply to production without deployment approval. Test old and new clients against these permissions.
2. Configure `ANTHROPIC_API_KEY` (and optional `ANTHROPIC_MODEL`) for summaries and `OPENAI_API_KEY` for authorized uploads. These were not provisioned/authorized for live checks in this workspace. Dictation also depends on browser support and microphone permission over HTTPS or localhost. Do not use real client audio in QA.
3. Run authorized synthetic authenticated staging checks across two subscriber accounts and two devices, including actual Supabase/PostgREST query behavior, concurrent requests, migration permissions, provider failures, and task-calendar sync. The embedded PostgreSQL test validates the actual SQL, but not hosted infrastructure or multiple network connections.
4. Validate provider retention agreements, deployment body limits, and recording-consent operational policy before enabling audio workflows. No new storage bucket is required; uploads are transient. The app does not verify legal consent independently.
5. Review imagery and desktop/mobile screenshots before publication. No deployment is included. The Calendar reference correction is documented in `docs/calendar-reference/README.md` and included in the combined review branch.

**Readiness:** ready for code/design review and isolated staging setup, not verified for production rollout. Live AI quality, real microphone accuracy, provider transcription accuracy, authenticated staging persistence, and production records have not been verified.

See [combined release review](release-review.md) for final audit results and publication scope.
