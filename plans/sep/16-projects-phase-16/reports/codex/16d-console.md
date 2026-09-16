# 16d — Console: Projects integrations, webhooks, imports, metrics

## Summary
Implemented read-only Console operator views for Projects external-platform data in both trees (platform `/projects/*` and workspace `/workspace/[orgSlug]/projects/*`), plus one audited operator mutation (replay webhook delivery). All reads render through `@876/projects-ui/platform/*` with no secrets; the replay route enforces `requireConsolePermission('console:organizations')`, writes the audit event before touching the operator client, and calls the client once. 52 new `it()` blocks (floor 30), including replay denied without permission and audit-before-call ordering.

## Files
- `src/lib/services/projects-integration.ts` — server-only wrapper around `create876ProjectsIntegrationClient` (internalKey + optional bearer token, requestId passthrough).
- `src/features/projects/projects-integration-mappers.ts` (+ `.test.ts`, 12 tests) — service `@876/projects/integration` → UI `@876/projects-ui/platform/types` mappers (`delivered`→`succeeded`, `preview`→`previewing`, `committed`/`partial`→`completed`, delivery `eventType` falls back to `eventId`, import `failureCount`→`errorCount`); drops `tenantId`/`organizationId`/`keyPrefix`/`contentHash`, never carries secrets.
- `src/features/projects/components/operator-skeleton-columns.ts` — appended `INTEGRATIONS_*`, `WEBHOOK_*`, `IMPORT_JOBS_*` column sets.
- `src/features/projects/components/integrations-data.tsx` (+ test, 6 tests) — `integrationClients.list(org)` → `IntegrationClientList` with `canEdit` omitted (read-only, no revoke form); asserts no secret/keyPrefix render.
- `src/features/projects/components/webhooks-data.tsx` (+ test, 6 tests) — `webhookEndpoints.list()` + `listDeliveries({limit:50})` → `WebhookEndpointList` + `WebhookDeliveryTable` + detail links under host base.
- `src/features/projects/components/webhook-detail-data.tsx` (+ test, 5 tests) — `retrieve(endpoint)` + `listDeliveries({endpointId})` → endpoint + deliveries + `WebhookReplayButton` per failed delivery; `notFound` on missing endpoint.
- `src/features/projects/components/webhook-replay-button.tsx` (+ test, 4 tests) — `'use client'` button POSTing to the Console replay route; string-only props (RSC-safe).
- `src/features/projects/components/imports-data.tsx` (+ test, 5 tests) — `importJobs.list(org)` → `ImportJobList` + detail links.
- `src/features/projects/components/import-detail-data.tsx` (+ test, 5 tests) — `retrieve(org,job)` + `listRows(org,job)` → job + `ImportPreviewTable` + `UnmappedFieldsTable`; `notFound` on missing job.
- `src/features/projects/components/health-data.tsx` (+ test, 4 tests) — `metrics.summary()` → `MetricsSummaryPanel` (24h/7d).
- Platform pages (`src/app/(app)/projects/`): `integrations/page.tsx`, `webhooks/(list)/page.tsx`, `webhooks/[endpointId]/page.tsx`, `imports/(list)/page.tsx`, `imports/[jobId]/page.tsx`, `health/page.tsx` — `Page` + `ResourceToolbar` + `Suspense` + `getPlatformOrganization`/`requirePlatformProjectsOrgId`, mirroring `custom-modules/**`.
- Workspace pages (`src/app/(app)/workspace/[orgSlug]/projects/`): same six routes with `resolveOrg` + `generateMetadata` (`<org> • <section> - Organizations`) + `projectsBase(orgSlug)`.
- `src/app/api/organizations/[id]/projects/webhook-deliveries/[deliveryId]/replay/route.ts` (+ `route.test.ts`, 5 tests) — operator mutation: `requireConsolePermission`, audit `projects.webhook-delivery.replayed` before the call, then `integration.webhookEndpoints.replay(deliveryId,{organizationId})` once; 404 on `*-not-found`, 400 otherwise.

## Secret handling
- List/retrieve/replay responses never carry secrets (asserted in mapper + component tests; `JSON.stringify` checks for `secret`/`keyPrefix`).
- `IntegrationClientList` used read-only (`canEdit` false, no revoke form); `WebhookEndpointList` shows only `hasSecret` presence (always true, no value); import detail shows only titles/statuses/errors, never file contents.

## Notes / follow-ups
- Webhook endpoint/delivery reads use the integration bearer tier (`PROJECTS_INTEGRATION_TOKEN` when set); without a token they surface as an `AppError` banner rather than crashing. A cleaner follow-up is internal org-scoped webhook CRUD in the API so Console needs no bearer env (same note as 16c).
- `void organizationId`/`void base` marks intentionally unused host params where the underlying integration route is org-implicit (webhook list, health summary).
- No `eslint-disable`/`as any`/`@ts-ignore`; scope kept to `apps/console/**` (plus this report); no commit/branch/push.

## Verification
- `pnpm --filter @876/console typecheck` — pass.
- `pnpm --filter @876/console exec eslint` on all new/changed files — pass (0 errors).
- `pnpm --filter @876/console exec vitest run` on 9 new test files — 9 files, 52 tests, all pass (incl. replay denied without permission and audit `invocationCallOrder` before replay).
- Spot-checked existing suites (`collaboration-mappers`, `custom-modules-mappers`, `activity/automation/clients`, org projects/issues routes) — pass.
- `node scripts/check-app-structure.mjs console` — pass.
- `pnpm check:rsc-boundaries` — pass (10 apps).
