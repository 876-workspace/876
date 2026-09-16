# Brief 16c — Projects app: integrations, webhooks, imports/exports, metrics

Repo `/root/projects/876`. Write code only; no commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`; no run logs. Touch only `apps/projects/**`. Read `plans/sep/16-projects-phase-16/plan.md`.

## Read
`packages/projects/src/integration.ts` + resources `integration-clients`, `webhook-endpoints`, `import-jobs`, `exports`, `metrics`; props of `packages/projects-ui/src/platform/*.tsx`; patterns `apps/projects/src/app/(app)/settings/automation/**` + routes.

## Deliver
- Settings → **Integrations**: clients list, new (name + `IntegrationScopePicker`) → shows `OneTimeSecret` once on the created page (secret passed only in that response, never stored client-side or in URL), revoke.
- Settings → **Webhooks**: endpoints list/new/edit (https URL, `WebhookEventPicker`, enable/disable, rotate secret → `OneTimeSecret`), delivery log per endpoint with replay (`projects.edit`).
- Settings → **Import**: upload file (read as text in the browser, ≤ 5 MB, sent to the route), choose source, preview (`ImportPreviewTable`, `UnmappedFieldsTable`), commit, job list/detail.
- Export links for work items and time entries (route streams CSV with `content-disposition`).
- Settings → **Health**: `MetricsSummaryPanel` (requires `projects.edit`).
- Thin routes; `projects.edit` for all writes. Tests floor **55 `it()`** incl. secret not present in any list response and not in redirect URLs.

## Verify
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs projects
pnpm check:rsc-boundaries

## Report
`plans/sep/16-projects-phase-16/reports/codex/16c-app.md`.
