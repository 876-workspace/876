# 16a — Projects API: integration tier, webhooks, CSV import/export, importers, metrics

## Summary
Implemented the Projects external platform inside `apps/projects-api` plus the
`@876/projects/integration` entrypoint. Integration clients authenticate with
`Bearer <clientId>.<secret>` (sha256 hashed-secret compare via `secretsMatch`),
carry per-route scopes, and are rate-limited per client. Webhook endpoints share
the phase-13 outbox (single drain, no second producer) and the relocated signer
at `src/platform/webhook-signature.ts`. Six pure CSV/JSON mappers feed one
`ImportBundle` pipeline (preview, then idempotent batched commit). CSV exports
reuse the phase-10 serializer plus injection guard. Metrics summarize
automation/webhook/import health over 24h/7d.

## Files
- `prisma/schema/external-platform.prisma` — `IntegrationClient`
  (`organizationId`), `WebhookEndpoint`, `WebhookDelivery`, `ImportJob`,
  `ImportJobRow`; tenant relations in `tenant.prisma`.
- `prisma/migrations/20260928000000_external_platform/migration.sql` —
  hand-written DDL (no migrate run).
- `src/platform/webhook-signature.ts` — signer moved here; automation +
  webhooks point at it (`modules/automation/webhook.ts` re-exports).
- `src/modules/integration/` — guard (scope, revoked-401, 600/min limit),
  service, controller, routes (`/v1/integration/*` + internal clients),
  Zod-derived OpenAPI with stable operation ids.
- `src/modules/webhooks/` — SSRF guard, retry schedule, service/repository/
  schemas/serializers/controller/routes, internal replay endpoint.
- `src/modules/imports/` — six mappers under `mappers/` (each cites its vendor
  export doc URL; Zoho reports its unverified layout in notes instead of
  guessing), jobs service, routes.
- `src/modules/exports/`, `src/modules/metrics/` — CSV exports, summary.
- `src/workers/automation.ts` — drain fans out to webhook deliveries.
- `packages/projects/` — `integration*.ts`, resources
  (`integration-clients`, `webhook-endpoints`, `import-jobs`, `exports`,
  `metrics`), `./integration` export-map entry.

## Fixes applied this session (21 failures to 0)
- `mappers/csv-mapper.ts` — missing CSV columns yielded `undefined` and crashed
  `parseInteger/parseUnixDate/parseBoolean`; added a `cell()` helper defaulting
  to `''` for every direct record access.
- `imports.service.test.ts` — `commitJob` calls `updateJob` twice
  (`committing`, then final); `mockImplementationOnce` was consumed by the first
  call, so the final serialize crashed. Uses `mockImplementation` now.
- `integration.openapi.ts` — `z.toJSONSchema` throws on `z.coerce`/transform
  schemas; passes `{ unrepresentable: 'any' }`.
- `webhooks/ssrf.ts` — dotted-quad literals were misclassified as
  `numeric-ip-hostname`, and `[::1]` bypassed the literal-IP path (WHATWG keeps
  brackets). Brackets are stripped, valid IPs skip the numeric guard, and a
  raw-host comparison catches non-standard numeric forms (`2130706433`,
  hex/octal) that `new URL` silently normalizes.
- `integration.controller.ts` — reused core `projectParamsSchema`/
  `issueParamsSchema` require `organizationId`, which integration routes don't
  carry as a path param (400s). Controller injects it from client context.
- `packages/projects/src/integration-schemas.ts` — moved
  `webhookDeliverySchema` above its list schema (use-before-declaration).

## Verification
- `prisma validate` / `prisma generate` — pass.
- `@876/projects-api typecheck` / `lint` — pass, after all edits.
- `@876/projects-api test` — 95 files, 1768 tests pass (177 new across
  integration/webhooks/imports/exports/metrics).
- `@876/projects typecheck` / `test` — pass (45 files, 323 tests; 27 new
  integration resource tests).
- No `eslint-disable` / `as any` / `@ts-ignore`; scope kept to
  `apps/projects-api/**` and `packages/projects/**`; no commit/branch, no
  migrate run, no run logs in repo.
