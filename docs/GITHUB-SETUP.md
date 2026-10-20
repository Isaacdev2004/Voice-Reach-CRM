# GitHub setup before Codex

## 1. Branch protection (`main`)

Settings → Branches → Add rule for `main`:

- [x] Require a pull request before merging
- [x] Require status checks to pass: **verify** (CI workflow)
- [x] Do not allow bypassing (except repo owners if needed)

## 2. Secrets (already in Vercel)

Do **not** duplicate production secrets in GitHub unless running deploy Actions. CI uses placeholder Clerk keys for `next build` only.

## 3. Codex / AI workflow

- Codex opens PRs against `main`; never push directly to `main` without review.
- Read `AGENTS.md` at repo root before changing API or billing code.
- Run locally: `npm run test:unit`, `npx tsc --noEmit`, `npm run build`.

## 4. Optional

- Enable Dependabot security updates.
- Add required reviewers for `app/api/**` changes.
