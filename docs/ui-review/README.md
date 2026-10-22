# MyARI visual comparison

These captures render the repository's actual React page and shell components in an
isolated Chromium preview. Authentication/router/image adapters and API responses
are replaced **only in the scratch preview**. All records are synthetic and writes
are disabled. Application authentication and APIs were not modified. The supplied
Contacts screenshot was not attached to the request; the checked-in original
Contacts page was the baseline instead.

Before: commit `76d988e`. After: `ui/myari-premium-refinement`.
Each pair uses the same fixtures and viewport (height 1,000px, full-page capture).
The production-setup banner is an existing environment warning, not new UI copy.
Some pre-existing external profile avatars are unavailable in this offline preview.
Screenshots do not certify live integrations, data accuracy, or authentication.

## Desktop comparisons

| Page | Before (1440px) | After (1440px) |
| --- | --- | --- |
| Dashboard | [Before](before/dashboard-1440.png) | [After](after/dashboard-1440.png) |
| Contacts | [Before](before/contacts-1440.png) | [After](after/contacts-1440.png) |
| Property Finder | [Before](before/properties-1440.png) | [After](after/properties-1440.png) |
| Campaigns | [Before](before/campaigns-1440.png) | [After](after/campaigns-1440.png) |
| Calendar | [Before](before/calendar-1440.png) | [After](after/calendar-1440.png) |
| Mortgage | [Before](before/mortgage-1440.png) | [After](after/mortgage-1440.png) |
| Notes & Strategy | [Before](before/notes-1440.png) | [After](after/notes-1440.png) |
| Tasks | [Before](before/tasks-1440.png) | [After](after/tasks-1440.png) |
| Voice Scripts | [Before](before/voice-scripts-1440.png) | [After](after/voice-scripts-1440.png) |
| Activity Logs | [Before](before/activity-1440.png) | [After](after/activity-1440.png) |
| Analytics | [Before](before/analytics-1440.png) | [After](after/analytics-1440.png) |
| Settings | [Before](before/settings-1440.png) | [After](after/settings-1440.png) |
| Automations | [Before](before/automations-1440.png) | [After](after/automations-1440.png) |
| Partners | [Before](before/partners-1440.png) | [After](after/partners-1440.png) |

## Responsive comparisons

| Page | 1920px | 768px | 390px |
| --- | --- | --- | --- |
| Dashboard | [Before](before/dashboard-1920.png) · [After](after/dashboard-1920.png) | [Before](before/dashboard-768.png) · [After](after/dashboard-768.png) | [Before](before/dashboard-390.png) · [After](after/dashboard-390.png) |
| Contacts | [Before](before/contacts-1920.png) · [After](after/contacts-1920.png) | [Before](before/contacts-768.png) · [After](after/contacts-768.png) | [Before](before/contacts-390.png) · [After](after/contacts-390.png) |
| Property Finder | [Before](before/properties-1920.png) · [After](after/properties-1920.png) | [Before](before/properties-768.png) · [After](after/properties-768.png) | [Before](before/properties-390.png) · [After](after/properties-390.png) |
| Campaigns | [Before](before/campaigns-1920.png) · [After](after/campaigns-1920.png) | [Before](before/campaigns-768.png) · [After](after/campaigns-768.png) | [Before](before/campaigns-390.png) · [After](after/campaigns-390.png) |
| Calendar | [Before](before/calendar-1920.png) · [After](after/calendar-1920.png) | [Before](before/calendar-768.png) · [After](after/calendar-768.png) | [Before](before/calendar-390.png) · [After](after/calendar-390.png) |
| Mortgage | [Before](before/mortgage-1920.png) · [After](after/mortgage-1920.png) | [Before](before/mortgage-768.png) · [After](after/mortgage-768.png) | [Before](before/mortgage-390.png) · [After](after/mortgage-390.png) |
| Notes & Strategy | [Before](before/notes-1920.png) · [After](after/notes-1920.png) | [Before](before/notes-768.png) · [After](after/notes-768.png) | [Before](before/notes-390.png) · [After](after/notes-390.png) |
| Tasks | [Before](before/tasks-1920.png) · [After](after/tasks-1920.png) | [Before](before/tasks-768.png) · [After](after/tasks-768.png) | [Before](before/tasks-390.png) · [After](after/tasks-390.png) |
| Voice Scripts | [Before](before/voice-scripts-1920.png) · [After](after/voice-scripts-1920.png) | [Before](before/voice-scripts-768.png) · [After](after/voice-scripts-768.png) | [Before](before/voice-scripts-390.png) · [After](after/voice-scripts-390.png) |
| Activity Logs | [Before](before/activity-1920.png) · [After](after/activity-1920.png) | [Before](before/activity-768.png) · [After](after/activity-768.png) | [Before](before/activity-390.png) · [After](after/activity-390.png) |
| Analytics | [Before](before/analytics-1920.png) · [After](after/analytics-1920.png) | [Before](before/analytics-768.png) · [After](after/analytics-768.png) | [Before](before/analytics-390.png) · [After](after/analytics-390.png) |
| Settings | [Before](before/settings-1920.png) · [After](after/settings-1920.png) | [Before](before/settings-768.png) · [After](after/settings-768.png) | [Before](before/settings-390.png) · [After](after/settings-390.png) |
| Automations | [Before](before/automations-1920.png) · [After](after/automations-1920.png) | [Before](before/automations-768.png) · [After](after/automations-768.png) | [Before](before/automations-390.png) · [After](after/automations-390.png) |
| Partners | [Before](before/partners-1920.png) · [After](after/partners-1920.png) | [Before](before/partners-768.png) · [After](after/partners-768.png) | [Before](before/partners-390.png) · [After](after/partners-390.png) |

## Automated browser checks

- 56 before views and 56 after views: 14 routes × 4 widths.
- Final after views have no uncaught page errors or document horizontal overflow.
- Contact table scrolling stays inside its keyboard-focusable region on mobile.
- 13 interaction/contrast checks passed; see [results](after/interactions.json).
- All 12 sidebar destinations rendered with one page headline and one active item.
- The two existing secondary routes (Automations and Partners) were also captured.
- Core palette contrast: primary button 5.93:1, muted text 4.96:1, body text 14.99:1.
  This is a core-token check, not a complete WCAG certification of all legacy content.

See [implementation and staging review](../UI-REFINEMENT.md) for scope, known issues,
and the required authenticated staging checks.
