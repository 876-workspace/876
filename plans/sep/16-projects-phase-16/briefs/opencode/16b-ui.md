# Brief 16b — projects-ui external platform components

Repo `/root/projects/876`. Write code only; no commit/branch/push; no `eslint-disable`/`as any`/`@ts-ignore`. Touch only `packages/projects-ui/**`.

## Contracts (write to `packages/projects-ui/src/platform/types.ts`)
```ts
type IntegrationClient = { object: 'projects.integration-client'; id: string; name: string; scopes: string[]; lastUsedAt: number | null; revokedAt: number | null; createdAt: number }
type WebhookEndpoint = { object: 'projects.webhook-endpoint'; id: string; url: string; eventTypes: string[]; enabled: boolean; consecutiveFailures: number; hasSecret: boolean; updatedAt: number }
type WebhookDelivery = { object: 'projects.webhook-delivery'; id: string; endpointId: string; eventId: string; eventType: string; attempt: number; status: 'pending' | 'succeeded' | 'failed'; responseCode: number | null; nextAttemptAt: number | null; createdAt: number }
type ImportJob = { object: 'projects.import-job'; id: string; source: 'csv' | 'jira-csv' | 'jira-json' | 'trello-json' | 'asana-csv' | 'zoho-csv'; status: 'previewing' | 'ready' | 'committing' | 'completed' | 'failed'; rowCount: number; errorCount: number; importedCount: number; createdAt: number }
type ImportRowPreview = { rowNumber: number; title: string | null; status: 'valid' | 'invalid'; errors: string[] }
type UnmappedField = { source: string; field: string; occurrences: number }
type MetricsSummary = { object: 'projects.metrics-summary'; windows: { window: '24h' | '7d'; automationRuns: { total: number; failed: number }; webhookDeliveries: { total: number; failed: number }; importJobs: { total: number; failed: number } }[] }
```

## Read budget
`packages/projects-ui/src/automation/automation-run-table.tsx` + test, `packages/projects-ui/src/custom-modules/dashboard-widget.tsx`, package.json exports.

## Deliver `packages/projects-ui/src/platform/`
- `integration-client-list.tsx` (name, scope badges, last used, revoked state; revoke form to `revokeActionBase` string when `canEdit`)
- `integration-scope-picker.tsx` (checkbox group named `scopes` over `projects:read|projects:write|time:read|time:write|webhooks:manage`)
- `one-time-secret.tsx` (shows a newly created secret once with a copy button; text says it will not be shown again)
- `webhook-endpoint-list.tsx` (url, events count, enabled/disabled badge, failure count flagged ≥ 5)
- `webhook-event-picker.tsx` (checkbox group named `eventTypes` from provided `options`)
- `webhook-delivery-table.tsx` (status badge, response code, attempt, next attempt)
- `import-job-list.tsx`, `import-preview-table.tsx` (invalid rows first, errors listed), `unmapped-fields-table.tsx`
- `metrics-summary-panel.tsx` (per window, failure rate % with one decimal from integer maths, 0 total → em dash)
- Explicit subpath exports `./platform/<name>`. Tests beside each, floor **55 `it()`**.

## Verify
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test

## Report
`plans/sep/16-projects-phase-16/reports/opencode/16b-ui.md`.
