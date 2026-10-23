# Public website visual correction and product showcase

## Visual findings and repairs

The prior hero combined a CSS monitor frame and Dashboard image over a living-room photograph. Its extra product/pillar sections increased page length and competed with the core content. The correction removes the device entirely. A new generated architectural editorial image supplies natural oak, travertine, greenery and lake-facing windows; the image is decorative, not a listing or photograph of subscriber property. The original dashboard hero inside the application is unchanged.

The public hero is about 400px at typical desktop widths (previous 495px), with a 44–50px serif headline, improved natural wrapping and a 17px description. The two original actions remain. Six capability cards have 24px serif titles, consistent padding, readable descriptions and restrained bronze hover treatments. Extra pillar navigation/AI/workflow sections remain on Features rather than expanding the homepage.

Phase 12 adds a 60/40 Dashboard/editorial split immediately after capabilities. It uses the requested exact headline, description and three benefits, links Explore MyARI to `/features`, and frames the image as an application rather than a device. A fresh actual Dashboard capture uses mocked APIs, synthetic records and a 2x browser scale. The 2880×2160 WebP is approximately 498 KiB, retains its 4:3 aspect ratio, and is linked at full size. Image loading is deferred below the hero. The photographic hero WebP is approximately 210 KiB. All public images have explicit dimensions or sized containers. No measured field Core Web Vitals claim is made.

The existing Contacts editorial section, three tool cards, photographic trial CTA and truthful trial/setup qualifications remain. FAQ and the complete feature directory preserve useful information and links. Shared feature pages now use feature-specific captures instead of unrelated screenshots, including clean Voice Studio, Ask MyARI and Analytics captures. Source metadata dimensions match their assets. Financing receives a separate generated decorative desk image. Repository lifestyle assets are retained; their external license provenance was not independently verified.

## Before/after evidence

Captured from actual components with mocked boundaries; no production records or communications:

- [Desktop before](public-home-correction/before-home-1440.webp) / [after](public-home-correction/after-home-1440.webp)
- [Laptop before](public-home-correction/before-home-1280.webp) / [after](public-home-correction/after-home-1280.webp)
- [Tablet before](public-home-correction/before-home-768.webp) / [after](public-home-correction/after-home-768.webp)
- [Mobile before](public-home-correction/before-home-390.webp) / [after](public-home-correction/after-home-390.webp)
- [Browser results](public-home-correction/browser-results.json)

The before images represent the working implementation immediately before this correction, including earlier pending public refinements. Desktop and mobile renders were visually inspected. No fake product metrics or notification overlays were inserted into the screenshots. The synthetic Dashboard intentionally shows small counts and available/absent analytics as produced by actual UI logic.

## Functionality and security

Navigation, Product/Solutions dropdowns, keyboard dismissal/focus return, mobile navigation, signup plan selection, Features tabs and contact-form success/failure are browser-tested. Existing authentication, backend business logic, plan prices, trial duration and SEO routes are preserved. Style-only auth-wrapper readability improvements do not change Clerk configuration or provider restrictions. There is no new MLS or paid provider integration.

The playbook remains gated: name/email submission must be accepted by the existing lead-capture mailbox workflow before the private PDF attachment is submitted for email delivery. Missing configuration and provider failures fail closed. See [gated delivery details](PLAYBOOK-GATED-DELIVERY.md). No public PDF download endpoint exists. Resend configuration and real inbox delivery remain unverified.

## Validation

- Full unit suite passed, including CRM, tenant isolation, voice, settings, billing-engine, calendar and public-marketing checks.
- TypeScript passed. ESLint passed with seven existing warnings in root fonts, OAuth image elements and campaign-detail hooks.
- Production build passed.
- Public marketing tests passed; contact/playbook providers mocked, no real mail sent.
- Security verification passed.
- Production smoke: all 48 public routes HTTP 200, one H1 and canonical; sitemap/robots reachable locally.
- Responsive browser checks: home and Features at 1440/1280/768/390; shared feature routes additionally checked desktop/mobile. Results file records completion.
- No production credentials, billing records, contacts, campaigns or database migrations changed.

## Main files

`components/marketing/public-product-experience.tsx`, `public-site-refinement.css`, shared feature/SEO/resource templates and navigation; `lib/marketing/feature-showcases.ts`, `product-captures.ts`, `hero-images.ts`; public image assets; capture and browser test scripts; playbook route/form/private resource, output tracing and gated-delivery tests. Git's PR file list is the authoritative complete change list.

## Release limits

Ready for review after CI passes. Latest user instruction authorizes deployment, but production release must use the tested commit and pass GitHub/Vercel checks. Live Clerk sign-in, real email receipt and external integration availability are not established by synthetic QA. Production-only configuration failures must not be reported as verified working. No production migrations are required for these public changes.
