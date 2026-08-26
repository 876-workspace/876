# Parked: Cloudflare deployment

Nothing in this directory is built, bundled, installed, or deployed. `parked/`
is outside the pnpm workspace globs (`apps/*`, `packages/*`), so no install, no
`turbo` task, and no CI job reaches it.

876 deploys to **Vercel** (`apps/*/vercel.json`). Cloudflare was parked on
2026-08-26 after an unexpected bill: Workers Builds and the Containers behind
`876-api`, `876-billing-api`, `876-couriers-api`, and `876-storage-api` were
still deploying and running from `main`. Deleting the config stops this repo
from redeploying them — it does **not** stop the charges. The Workers, Container
applications, R2 buckets, and the Workers Builds git connection must also be
removed in the Cloudflare dashboard.

## What is here

| Path                              | Was                                                         |
| --------------------------------- | ----------------------------------------------------------- |
| `apps/<app>/wrangler.jsonc`       | `apps/<app>/wrangler.jsonc`                                 |
| `apps/<app>/open-next.config.ts`  | `apps/<app>/open-next.config.ts`                            |
| `apps/<app>/worker/`              | `apps/<app>/worker/` (the Container front-door Worker)      |
| `apps/<app>/.dev.vars.example`    | `apps/<app>/.dev.vars.example`                              |
| `apps/billing-api/tests/`         | `apps/billing-api/src/config/__tests__/wrangler.features.*` |
| `workflows/deploy-cloudflare.yml` | `.github/workflows/deploy-cloudflare.yml`                   |
| `workflows/sync-*-secret/`        | `.github/actions/sync-*-secret/`                            |
| `scripts/*`                       | `scripts/` (release contract + Worker preflights)           |

Removed along with them: the `preview` / `deploy` / `upload` / `cf:build` /
`cf-typegen` scripts in every app, the root `preview:*` / `deploy:*` /
`check:worker-*` / `check:cloudflare-release` scripts, the
`initOpenNextCloudflareForDev()` call in every `next.config.ts`, and the
`@opennextjs/cloudflare`, `wrangler`, `@cloudflare/containers`, and
`pg-cloudflare` dependencies.

## Notes for whoever revives this

- The parked `wrangler.features.test.ts` was the only guard keeping
  `BILLING_LATE_FEES_ENABLED`, `BILLING_DUNNING_ENABLED`, and
  `BILLING_PAYOUTS_ENABLED` shipped as `"false"`. Those flags must stay disabled
  in the Vercel environment; the assertion now has no wrangler file to read.
- Runtime code that exists _because_ of workerd — the `@prisma/adapter-neon`
  clients and the request-scoped Prisma resolver in `packages/core/src/db/` —
  was deliberately left in place. It is correct on Node too, and removing it is
  a behaviour change, not a parking exercise.
- `docs/cloudflare.md` stays where it is (many rule files link to it) and now
  opens with a parked banner.

Restoring is a `git mv` back plus `pnpm add` of the four dependencies.
