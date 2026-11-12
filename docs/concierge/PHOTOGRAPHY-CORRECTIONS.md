# Concierge photography correction

Root cause reproduced on the actual optimized Next server: /_next/image with q=85 returns HTTP400 because the configured Next16 quality allowlist defaults to75. The previous local browser harness decoded source assets and therefore did not exercise that rejection.

Replace hand-written optimizer URLs and CSS-only feature photos with a shared Next/Image component using explicit quality75, responsive sizes, fixed slots, cover cropping, lazy loading and an approved-photo fallback. No global image configuration change. Main hero is a balanced split capped at300px on desktop,180px on working steps, with separate mobile cropping. Remove Contact Migration's redundant secondary image. Add seven distinct image-led orientation cards. Campaign content and all onboarding logic remain unchanged.

Verification: real local optimized-server test makes12 actual image-optimizer requests, requires HTTP200, image content types and decoded dimensions, and asserts q85 still rejects. Actual-component Chromium browser tests decode the six campaign photos and seven orientation photos at desktop/tablet/mobile widths and retain the existing functional regression. TypeScript, lint, security, Concierge units and optimized build run separately. Safari and authenticated protected-Preview browser acceptance are not claimed. Automatic approval review rejected creation of a share URL because it would broaden protected Preview access; protection remains intact.

Files: components/concierge/photo.tsx, workspace.tsx, concierge.css; scripts/concierge-browser.test.cjs and concierge-images.test.cjs. No SQL, Production settings, billing, messaging, authorization, campaign-content or CSV-logic changes.
