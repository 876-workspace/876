# Deployment & CI Signals

Read this before deploying any app, judging whether a PR is mergeable, or
reading a check status. It states which infrastructure is actually live, so
stale Cloudflare/GitHub Actions material elsewhere in the repo is not mistaken
for a gate.

## Vercel is the only deploy target

User, 2026-09-15: _"I'm only interested in Vercel."_

- Every Next.js app and every Express service deploys to **Vercel**. Deploys are
  manual; production goes stale silently unless someone deploys it.
- **Cloudflare is not used for hosting.** Workers, Containers, Workers Builds,
  OpenNext deploy scripts, `wrangler.jsonc`, and `docs/cloudflare.md` describe
  a retired setup. Do not deploy to Cloudflare, do not fix Cloudflare build
  configuration, and do not treat a `Workers Builds:` check as a signal.
- The one live Cloudflare use is **Cloudflare Tunnels in development**, to view a
  locally running app from another device.
- Sections of `CLAUDE.md` and other rules that still describe Cloudflare
  deployment are historical until they are rewritten; this rule wins where they
  conflict.

## GitHub Actions is not a merge gate

GitHub Actions minutes are exhausted. Jobs fail within seconds without running
any step. **Ignore CI status entirely** — failing `build`, `verify`,
`structure`, or test jobs, and every Cloudflare check.

The merge gate is the orchestrator's own local verification, run in the
foreground: typecheck, lint, tests, `node scripts/check-app-structure.mjs`,
`pnpm check:rsc-boundaries`, and `prisma validate` for any service whose schema
changed. Record the results in the PR description.

## Deploying

1. For every service whose PR added a migration, run `prisma migrate status`
   against production and apply pending migrations with `prisma migrate deploy`.
   Development and production share the same databases.
2. Deploy each touched app to Vercel production.
3. Confirm the deployed commit matches the merged commit, then smoke-test the
   deployed URL.
