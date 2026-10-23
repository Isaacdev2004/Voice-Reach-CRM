# Calendar reference correction

This follow-up corrects the visual mismatch in PR #19. That PR was merged into `audit/delivery-analytics-health`; its Calendar commit was absent from `main` when checked. The final review branch must target `main` and explicitly include the unmerged Calendar/Phase 18 and delivery-audit dependencies. No production merge/deployment is performed by this correction.

## Changes

- Updated hero to the latest supplied reference: **CALENDAR / Plan today. Close tomorrow. / Keep appointments, follow-ups, and important moments beautifully organized.** A new coastal-office photograph replaces the previous garden-office photograph.
- Calendar-only navigation/header proportions now use a 220px sidebar, consistent gutter, compact hero, and one balanced toolbar: source tabs, actual date range/native date picker, view controls, and Add Event. Agenda remains available in the source tabs rather than appearing twice.
- Calendar visibility, colors, search, timezone display, refresh, and preferences sit in the left panel, making the central week grid the focal point. Only actual configured calendars are shown; reference-only Personal/Family/Showings sources are not invented.
- Refined source icons, appointment-type colors (respecting saved overrides), day labels, event typography, borders, all-day rows, integration cards, mini-calendar navigation, and daily agenda. Unnecessary trailing mini-calendar weeks are omitted without omitting dates in the selected month.
- Daily agenda shows the next two recorded items with View all opening the full existing Agenda. Quick Actions follows it; additional appointments, booking requests, and priorities remain available below.
- The grid uses 48px per hour to match the reference density. Event/slot/current-time positions, initial scroll, and pointer-resize snapping share the matching minute-to-pixel scale. Duration, stored timestamps, timezone/DST logic, API contracts, and tenant filters are unchanged.
- Desktop, tablet, mobile panels, keyboard event details, reduced motion, saved preferences, and existing drag/drop remain supported. Real overlaps are preserved in separate lanes; very narrow overlapping blocks may still truncate, with full titles in accessible details/tooltips. No reference sample events are inserted into subscriber data.

## Evidence

- [1536px — reference width](calendar-1536.png)
- [1440px](calendar-1440.png), [1920px](calendar-1920.png)
- [768px](calendar-768.png), [390px](calendar-390.png)
- [Tablet details](calendar-details-768.png), [Mobile details](calendar-details-390.png)
- [Browser results](browser-results.json)

Screenshots render actual components with isolated synthetic HTTP/service fixtures, including additional clearly synthetic appointments to demonstrate a populated week. They do not verify real subscriber schedules, connected Google/iCloud accounts, production migrations, or staging provider authorization. Disconnected states remain truthful rather than copying the reference's Connected badges.

Browser tests passed at all five widths with no page overflow or JavaScript page errors, and exercised creation, editing, resizing, failed drag rollback, filters/search, Month/Week, delete confirmation, mobile drawers, and tenant switching. The initial standalone build required access to allowed Google Fonts hosts; the final combined branch preserves `main`'s existing stylesheet-font build fix. See the combined release report for final lint/type/unit/build results.

No live appointments were modified, providers connected, invitations/messages sent, or production deployment performed.
