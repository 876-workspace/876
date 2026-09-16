# 16c — Projects app: integrations, webhooks, imports/exports, metrics

## Summary
Implemented the Settings → Integrations / Webhooks / Imports / Health surfaces
plus work-item and time-entry CSV export links inside `apps/projects`, backed by
thin session-tier routes over the phase-16a `@876/projects/integration`
resources. All reads require `projects.view`; all writes require
`projects.edit` (metrics summary requires `projects.edit`); routes are thin
Zod-validated wrappers with no DB or provider access. 110 new `it()` blocks
(floor 55), including secret-redaction coverage.

## Files
- `src/lib/integration-inputs.ts` (+ `.test.ts`, 24 tests) — Zod schemas for
  client create, webhook create/update (https-only URL, `WebhookEventPicker`
  values), delivery query, import create (5 MB `Buffer.byteLength` refine),
  export queries. Exports `MAX_IMPORT_BYTES` for the browser uploader.
- `src/lib/integration-mappers.ts` (+ `.test.ts`, 19 tests) — API →
  `@876/projects-ui/platform/types` mappers (`delivered`→`succeeded`,
  `scheduled`/`delivering`→`pending`, import `preview`→`previewing`,
  `committed`/`partial`→`completed`; delivery `eventType` falls back to
  `eventId` since the API has no event type), `WEBHOOK_EVENT_OPTIONS`,
  `IMPORT_SOURCE_VALUES`, `generateWebhookSecret()` (32 random bytes, 64 hex).
- `src/lib/services/integration.ts` — server-only wrapper around
  `create876ProjectsIntegrationClient` (internalKey); CSV exports fetched via
  org-scoped internal fetch to `/v1/organizations/:org/exports/*.csv`.
- `src/lib/client/integration.ts` (+ `client/index.ts` wiring) — browser
  wrappers for every thin route.
- Settings nav — new Platform group (Integrations/Webhooks/Imports/Health) in
  `settings/_lib/settings-nav.ts` (+ inventory test update).
- `settings/integrations/` — list (`IntegrationClientList` display +
  `IntegrationClientsManager` revoke via fetch) and `new/`
  (`IntegrationCreateForm`: name + `IntegrationScopePicker`).
- `settings/webhooks/` — list, `new/` (`WebhookCreateForm`: https URL +
  `WebhookEventPicker` + enabled), `[endpointId]/` (detail +
  `WebhookDeliveryTable` + `WebhookDeliveryManager` replay of failed),
  `[endpointId]/edit/` (`WebhookEditForm`: save + rotate-secret).
- `settings/imports/` — upload (`ImportUploadForm`: `FileReader.readAsText`,
  `file.size` ≤ 5 MB client check, source select) + job list
  (`ImportJobList`) + export links; `[jobId]/` — `ImportPreviewTable`,
  `UnmappedFieldsTable`, `ImportJobCommitPanel`.
- `settings/health/` — `MetricsSummaryPanel`, page requires `projects.edit`.
- Thin routes (`src/app/api/`): `integration-clients/` (GET/POST, 201 JSON),
  `integration-clients/[clientId]/revoke` (POST), `webhook-endpoints/`
  (GET/POST), `webhook-endpoints/[endpointId]` (GET/PATCH/DELETE),
  `.../[endpointId]/deliveries` (GET), `webhook-deliveries/[deliveryId]/replay`
  (POST), `import-jobs/` (GET/POST), `import-jobs/[jobId]` + `/rows` (GET) +
  `/commit` (POST), `exports/work-items` + `exports/time-entries` (CSV via
  `csvDownload`, `content-disposition: attachment`), `metrics/summary` (GET).
  13 route test files, 67 tests.

## Secret handling
- Client secret and webhook signing secret are returned only inside the create
  (or rotate) JSON response, rendered once via `OneTimeSecret` from component
  `useState`, never placed in a URL, redirect, or client storage. Create
  returns 201 JSON with no redirect and no `location` header.
- List, retrieve, revoke, and update responses never carry secrets
  (asserted in route tests); the rotate-secret form generates the replacement
  client-side, sends it on update, shows it once, and the update response
  never echoes it back.

## Notes / follow-ups
- Webhook endpoints/deliveries use the integration bearer tier, so the app
  passes a bearer token from `PROJECTS_INTEGRATION_TOKEN` when set; org-scoped
  exports use the internalKey tier (multi-org correct). A cleaner follow-up is
  internal org-scoped webhook CRUD in the API so the app needs no bearer env.
- `Buffer` appears only in server-only code (Zod refine, service); the browser
  form imports only `MAX_IMPORT_BYTES`.
- Pre-existing lint warnings in login/register/shell untouched; no
  `eslint-disable`/`as any`/`@ts-ignore` in new code.

## Verification
- `pnpm --filter @876/projects-app typecheck` — pass.
- `pnpm --filter @876/projects-app lint` — 0 errors (4 pre-existing warnings).
- `pnpm --filter @876/projects-app test` — 230 files, 1568 tests, all pass.
- `node scripts/check-app-structure.mjs projects` — pass.
- `pnpm check:rsc-boundaries` — pass (10 apps).
