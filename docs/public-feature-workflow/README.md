# Homepage feature discovery and connected workflow

This change refines the existing flowchart component from PR #50 in a homepage-only release branch, without merging the Assistant branch.

## What changed

The heading remains **A complete real estate workspace.** The same nine capabilities (six core cards plus Property Finder, Mortgage Calculator and Notes & Strategy) are consolidated into a compact three-column desktop grid. Names, descriptions and visible Learn More destinations remain available; no capability was dropped. Tablet uses two columns and mobile one. The lower productivity copy and its Explore the Workspace CTA remain; duplicate large tool cards are avoided.

The Contacts screenshot in the homepage's Stay connected, effortlessly section is replaced by a semantic HTML/CSS/SVG illustration: **Capture → Organize → Nurture → Convert**. Four connected stages run horizontally on desktop, adapt on tablet and stack on mobile. MyARI Assistant is a supporting layer across the journey, limited to configured/account-available drafting, supplied-note summaries and planning. Convert describes agent-led appointments and next steps, not autonomous or guaranteed sales.

The Features page keeps its original six core cards, three tool cards and Contacts capture. Homepage hero, branding, navigation, footer, pricing/trial rules and CTA destinations remain unchanged. Existing plans, provider setup, consent and review requirements remain explicit. No backend, CRM, Assistant access, billing or sending behavior changes.

## Measured acceptance

Actual production Next.js pages were tested in an ephemeral, credential-free Vercel Sandbox. APIs were intercepted in the browser test to prevent tracking writes; public feature-page navigation and all nine Learn More destinations used the real local application, not mocked page HTML.

| Viewport | Feature section height | Result |
| --- | ---: | --- |
| 1440 × 900 | 616px | PASS |
| 1366 × 768 | 616px | PASS |
| 1280 × 800 | 616px | PASS |
| 768 × 900 | 903px | PASS |
| 390 × 900 | 1551px | PASS |

All desktop layouts fit the complete feature section within the viewport after allowing space for navigation. All sizes retain nine descriptions and Learn More actions, no horizontal overflow, working keyboard navigation and reduced-motion support. The desktop workflow stages share one horizontal row. Scoped axe checks found zero detected A/AA violations in the changed sections. This is not a claim of complete site-wide WCAG certification.

TypeScript, affected component lint, public marketing regressions (36 navigation/footer destinations and 48 indexable routes), mocked contact/playbook delivery checks, capture-asset validation and the optimized build passed. The contrast of workflow numbering was corrected after the first accessibility test; the original fixed 162px card minimum was removed after the smaller-desktop fit check failed. Final acceptance uses the corrected source.

Screenshots and browser-results.json are generated at five sizes. The dedicated GitHub browser workflow uploads full-resolution captures as the **public-homepage-desktop-tablet-mobile** artifact. workflow-preview.jpg is a smaller rendered review image, not the implementation.

## Isolation and review

The new branch disables automatic Git deployment. Its protected Preview is public-website-only, with database/authentication/model/provider credentials blank and sending, billing, subscriber rollout, Assistant, Concierge and scheduler access disabled. Install/build guards check the exact Preview project, branch and commit and reject unexpected credential inheritance before npm dependency installation. No existing Preview branch or Production variable is changed.

This review Preview deliberately does not provide subscriber sign-in, checkout or CRM integrations. Their destinations and Production source behavior are preserved; authenticated subscriber flows are outside these public-layout tests. Do not introduce Production credentials to make those controls active in this Preview.

## Reproduce

Run npm ci, npm run test:public-marketing, npx tsc --noEmit, affected ESLint, and npm run build.

Install the optional browser tools outside the repository:
`npm install --prefix /tmp/home-ui-tools playwright@1.56.1 @axe-core/playwright@4.10.2`, then install Chromium and its system dependencies. Start the production build locally with no provider credentials and run:
`NODE_PATH=/tmp/home-ui-tools/node_modules node scripts/homepage-workflow-browser.test.cjs`.
PUBLIC_REVIEW_URL can select another isolated local origin.

No database migration is required. Production merge/deployment requires separate owner approval. Rollback is a code revert or redeployment of the preceding reviewed revision; no SQL, data restore or provider configuration change is required.
