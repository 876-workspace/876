# Quote lifecycle implementation report

## Changed files

- `apps/billing-api/src/modules/documents/documents.routes.ts`: registered tenant `sales:write` quote transition endpoints.
- `apps/billing-api/src/modules/documents/documents.controller.ts`: added thin transition controllers.
- `apps/billing-api/src/modules/documents/documents.service.ts`: owns the allowed-state transition table and maps quote conflicts to the registered error.
- `apps/billing-api/src/modules/documents/repositories/quotes/{index,transition}.ts`: added the atomic status update, including accepted/declined/canceled timestamps.
- `packages/core/src/lib/errors/billing.ts`: registered `billing/quote-invalid-state` (409).
- `packages/billing/src/resources/quotes.ts`: added `send`, `accept`, `decline`, and `cancel` package methods.
- `apps/billing/src/lib/client/quotes.ts` and `apps/billing/src/app/(app)/(sales)/quotes/[quoteId]/*`: added client transition calls and a permission-gated Billing quote action surface.

## Migration

No migration was needed: `accepted_at`, `declined_at`, and `canceled_at` already exist on `Quote`. No Prisma migration was run.

## Tests

New `it()` cases: **0**. The requested minimum of 26 is not met.

## Verification

- `pnpm --filter @876/billing-api typecheck`: passed before the concurrent lockfile change made pnpm’s dependency preflight fail.
- Direct local TypeScript checks for `apps/billing-api` and `apps/billing`: completed after formatting, with no reported diagnostics.
- `git diff --check`: passed.
- `pnpm --filter @876/billing typecheck`, lint, boundaries, tests, DB validation, and app tests were not runnable after `packages/billing-ui/package.json` changed without the corresponding lockfile update. pnpm reported `ERR_PNPM_OUTDATED_LOCKFILE`.
- Initial and final pull attempts could not run: the branch has no upstream, and `origin` has no `feature/customer-contacts-ui` ref (`fatal: couldn't find remote ref`).

## Deliberately deferred / incomplete

- Convert-to-invoice is deliberately deferred, as required.
- Invoice-app quote action UI, both quote edit routes, and the required automated coverage remain incomplete.
