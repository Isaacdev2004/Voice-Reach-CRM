# Campaign email editing

The owner confirmed the five signed-in Assistant acceptance checks passed on Preview commit ffc74e8e0cefdfce43562b2fc678c04b60d1a014. This follow-up changes only the existing campaign editor.

- Campaign Preview's Edit action closes the preview drawer instead of leaving it covering the builder.
- Saved email steps expose Edit email, opening the matching owned sequence step.
- Email subject and body have separate inputs. Existing Subject/body storage remains compatible; no schema or sending changes.
- Save step updates the working draft. Save as template persists it through the existing authenticated builder API. Active/history-bearing campaigns continue opening a separate draft revision.
- Switching the step-selection query does not reload the campaign and erase unsaved edits.

No Production deployment, enrollment, outbound request, billing, access flag, or database migration is part of this change.

Validation: TypeScript, optimized build, full unit suite, security verifier and lint (seven existing warnings). Browser fixtures exercise desktop/tablet/mobile direct editing, subject/body preview, draft save payload, refresh persistence and forbidden-request detection. Hosted owner review remains required for this new email-editing interaction.
