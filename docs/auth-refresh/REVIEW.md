# Premium sign-in and account creation refresh

Prepared on `feat/premium-auth-refresh`, based on main `acf8699c222658e4840e084990dfbace79c26de8`. Not deployed. Automatic Git deployment is disabled for this review branch; no Production or environment-variable changes.

The auth shell now combines a framed architectural photograph, ivory/bronze palette, editorial typography, an original MyARI motivational quote and a focused credential card. Desktop/tablet show a split layout; mobile puts the form first and the compact inspirational panel below it. Uses the existing optimized local architectural image, with no new image/provider dependency. Quote is brand copy, not an attributed testimonial.

The circular Clerk form came from `clerkAppearance.variables.borderRadius = "9999px"`. The shared Clerk appearance now uses a 12px radius, with scoped auth CSS to keep the embedded card rectangular and remove nested card shadows. Sign-in/signup navigation appears once; privacy and terms links remain visible. The shared appearance also applies restrained corners and bronze controls to other Clerk UI through the existing provider.

Preserved: Clerk SignIn/SignUp components, paths, dashboard redirects, Google sign-in configuration, password/reset/verification behavior delegated to Clerk, account-creation effects, trial/checkout ownership logic and attribution. No backend APIs, access policies, subscriptions, trial terms, credentials, migrations, provider permissions, or sending behavior changed.

Validation:

- 399 existing unit tests, zero failures.
- Targeted pricing/billing and public-marketing regressions passed; no provider requests.
- TypeScript and production build passed using synthetic credential placeholders.
- Full lint: zero errors, seven existing warnings; edited components/preview harness lint clean.
- Real auth shell and form wrappers rendered in Chromium with visual Clerk fixtures at 1440, 768 and 390px for both modes. No horizontal overflow, correct headings/legal links, 12px inner card radius, zero API mutations.
- Screenshots in `previews/` are local component previews with mocked Clerk controls, not authenticated hosted acceptance. No real sign-in or account creation was performed. A protected Preview with authorized development credentials is still needed to inspect actual Clerk-rendered controls, password reset, verification, provider errors and redirects before deployment.

Review screenshots: sign-in-1440.jpg, sign-up-1440.jpg, sign-in-390.jpg and sign-up-390.jpg; tablet captures also included. On mobile the form comes before the photograph/quote to keep login immediately accessible.

Release: approve the visual direction, then separately authorize an isolated protected Preview with the correct branch-specific Clerk Development configuration. Do not merge or deploy to Production without approval. Keep production credentials and settings unchanged.

Rollback: revert this UI-only change or redeploy the previously approved code after authorization. No database/data rollback or credential rotation is needed. Do not change billing or authentication configuration to roll back styling.
