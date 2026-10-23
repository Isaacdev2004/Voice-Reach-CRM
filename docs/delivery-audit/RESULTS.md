# Verification results — synthetic evidence only

All commands exited successfully. Build and tests do not establish provider-level accuracy.

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | 0 errors; 8 existing font/image/hook warnings |
| `npm run test:unit` | Passed, including existing Contacts/Property Finder/campaign suites and new delivery tests |
| `npm run test:delivery` | 26 groups passed: 12 pure analytics/query tests + 14 API/provider-boundary tests |
| `npm run test:security` | Passed |
| `npm run test:regressions` | Passed |
| `npm run build` | Passed; 93 pages generated |
| Delivery browser QA | Passed at 1440, 1920, 768, 390; no page overflow or page errors; synthetic confirmation/cancel and independent health update checked |
| Existing Campaigns browser QA | Passed at all four widths |
| Live database/provider reconciliation | UNVERIFIABLE — network policy/access and authorized staging identity unavailable; no calls made |
| Migration | Reviewed as code only; NOT applied or database-tested |
| Production activation | Not authorized; rollout flags default off; staging verification and listed blockers remain |

- [Delivery browser results](delivery-browser-results.json)
- [Existing Campaigns browser results](campaign-browser-results.json)
- [Desktop log](screenshots/delivery-1440.png), [1920px](screenshots/delivery-1920.png), [tablet](screenshots/delivery-768.png), [mobile](screenshots/delivery-390.png)
- [Desktop drawer](screenshots/delivery-details-1440.png), [mobile drawer](screenshots/delivery-details-390.png)
- [Command logs](logs/)
- [Changed files](changed-files.txt)

All names, message content, timestamps and counts shown in screenshots are synthetic fixture data. The drawer's visual backdrop was inspected and corrected after an inherited button style made it opaque; final screenshots show the corrected overlay.

GitHub CLI authentication reports the configured `GH_TOKEN` invalid. A draft PR could not be created through the CLI. The authorized branch push uses the existing Git remote, and a manual review link can be opened after push. This is an authentication limitation, not a production deployment approval.
