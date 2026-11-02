# Final public website redesign — review scope

This finishes the existing PR #56 on feat/public-feature-workflow. Main remains unchanged.

## Approved direction
- Preserve the exact live coastal hero: /brand/marketing/public-architectural-hero.webp. No image replacement, recompression, or crop changes.
- Homepage eyebrow BUILT FOR REAL ESTATE AGENTS. Primary h1: More than a CRM. / A complete business partner.
- Supporting description uses “automate follow-up”. Preserve trial, walkthrough, exploration, navigation, pricing and conversion entry points.
- Remove the repeated lower headline. Preserve all nine feature cards and the Capture → Organize → Nurture → Convert illustration.
- Public individual feature pages lead with crisp responsive HTML/SVG product demonstrations, not interior photos.
- Tighten spacing with accessible text and graceful mobile flow. Do not touch authenticated CRM, sending, billing, Concierge or customer records.

## Route inventory and tailored demonstrations
- /features/lead-management: Every relationship, a clear next step. New lead → Organized contact → Next appointment.
- /features/pipeline-management: See the relationship behind each stage. Review stages → Choose a contact → Plan next steps.
- /features/automated-follow-up: A thoughtful sequence, at your pace. Choose audience → Prepare sequence → Review before launch.
- /features/campaign-builder: Build the follow-up you would want to receive. Audience → Sequence → Review.
- /features/text-automation: A small message. A personal opening. Personalize → Set timing → Check eligibility.
- /features/email-automation: Give your relationships room to grow. Draft email → Add follow-up → Review.
- /features/client-email-updates: Keep clients informed, in your own words. Supply context → Prepare draft → Personalize.
- /features/ringless-voicemail: Prepare a voice message worth hearing. Write script → Review audio → Review assignment.
- /features/voice-studio: The right words. Your personal voice. Write → Record & review → Approve.
- /features/lead-reactivation: A fresh reason to reconnect. Review contacts → Prepare check-in → Choose next step.
- /features/calendar-and-tasks: Make space for what matters today. Appointments → Priorities → Next steps.
- /features/notes-and-strategy: From a useful thought to a clear next step. Capture → Organize → Plan.
- /features/property-finder: Start with the buyer. Refine the search. Save criteria → External search → Personal follow-up.
- /features/mortgage-calculator: Bring the numbers into the conversation. Assumptions → Payment estimate → Compare & report.
- /features/ai-assistant: Your ideas. A thoughtful starting point. Agent prompt → Illustrative draft → Review & revise.
- /features/analytics: Clarity from the activity you can verify. Activity → Delivery evidence → Follow-up.
- /features/notifications: Give the next important action a place. Review → Prioritize → Act.
- /features/automation-workflows: Consistency, with considered controls. Choose steps → Set delays → Review controls.
- /features/google-calendar: Connect your calendar, on your terms. Configure → Authorize → Verify.
- /features/dotloop-integration: Keep transaction context close at hand. Configure → Authorize → Verify access.

All twenty routes preserve their existing metadata, canonical paths, primary signup destination, related capabilities and pricing links. Each has an accessible three-step walkthrough; ten product families provide distinct presentations. Notes and scripts are locally editable, the mortgage illustration recalculates, and integration pages explain configuration/authorization requirements without implying verified connectivity.

## Truthfulness and safety
These are disclosed illustrative product walkthroughs with synthetic data, not live customer sessions. No demo fetches CRM data, invokes an AI provider, persists notes, enrolls recipients, activates sending, connects an integration or bills anyone. AI capabilities depend on configured providers and authorized account access. Google Calendar and Dotloop are unconnected setup demonstrations. Property Finder makes no IDX or Zillow-tracking claim. Financing estimates are not quotes or approvals. Existing original-resolution interface captures remain available in expandable supporting sections.

## Images
The main public visual assets are inventoried by scripts/public-image-inventory.cjs. The original homepage hero remains its native 1536×1024 WebP (214,558 bytes), unchanged. Responsive demonstrations use HTML/CSS/SVG and remain crisp with larger display density. Supporting capture widths are capped at half their recorded pixel width to avoid enlarging the 700px calendar capture. Source resolution alone does not guarantee perceived text legibility; original captures are linked for full-size viewing. The preserved homepage photograph is an explicit source-resolution exception, not a newly invented higher-resolution image.

## Validation and review
Run npm ci, TypeScript, lint, npm run test:public-marketing, and npm run build.
Run the existing homepage workflow browser suite plus scripts/public-feature-pages-browser.test.cjs with a credential-free local production server and Playwright. The new suite covers 20 routes × 5 sizes (1440×900, 1366×768, 1280×800, 768×900, 390×900), interactive states, keyboard tab navigation, local editor state, mortgage recalculation, related links, canonical metadata, no outer horizontal overflow, and scoped WCAG A/AA scans at desktop/mobile. It checks the homepage’s original photo, sole primary message, grid and workflow too.

CI artifacts contain all after screenshots and an independent pinned pre-redesign capture job. The before job uses commit 56a456b96c789215dcf16a588abe3167b80040fb; it never rebuilds main or uses Production credentials.

Protected Preview only. Keep branch-specific credential-free overrides and install/build isolation checks. No merge or Production release is authorized.

## Release and rollback
After owner review and explicit approval: recheck CI on the approved SHA, create a separately reviewed Production build with existing approved configuration, smoke-test public routes/navigation/CTAs, and monitor errors/layout shifts. No SQL or data changes are needed. Roll back application traffic to the prior approved Production deployment if regression occurs; no database restoration is required. Do not promote this deliberately credential-free Preview as a Production build.
