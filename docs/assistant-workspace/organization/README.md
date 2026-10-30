# History, Voice Script organization and calendar refinements

Preview-only follow-up to the owner-reviewed Assistant and email editor.

- Each conversation has a three-dot disclosure with Pin to top / Unpin and Delete conversation. Deletion uses the existing confirmed, owner-scoped endpoint. Deleting another conversation leaves the active conversation and proposals intact. CRM records and execution/usage audits remain unchanged.
- Pins are account-scoped browser preferences and contain identifiers only. They are not synced across devices. Storage failures are shown explicitly.
- Realtors can create custom Voice Script categories and assign a category to an owned recording. Assigned categories persist in existing studio_metadata through the owner-filtered PATCH route; no schema changes. Approved audio/content remains immutable. Category-only organization changes and archiving are permitted without altering audio, approvals or campaign assignments.
- Unused category names are remembered per account in this browser. Once assigned, names are rediscovered from server-returned owned recordings on other devices.
- The main calendar shows the selected month and year in a serif heading. Date navigation updates it, including year boundaries.
- Quick Actions, Daily priorities and Daily agenda now appear below All Calendars on the left, in that order. The existing mobile calendar panel remains the access point on narrow screens. Integrations, mini-calendar and upcoming appointments remain on the right.

Validation: 400 Node assertions, 317 mocked Assistant browser checks across seven viewport widths, synthetic Voice Studio category create/assign/reload checks, owner-denial and approved-content protection tests, optimized build, TypeScript, security verifier. Lint has seven pre-existing warnings and no errors. Calendar browser checks verify the new heading across December/January and existing scheduling flows.

No Production configuration, migrations, billing, sending, Concierge access or subscriber entitlements change. Preview uses the existing private staging isolation build guard. Hosted signed-in review of the new interactions remains separate from mocked browser acceptance.
