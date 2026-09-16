# Brief 16b — projects-ui external platform components

## What was built

New `packages/projects-ui/src/platform/` surface (contracts + 10 components),
following the existing `automation-run-table` / `client-grant-list` /
`instantiate-options` patterns (Badge + Table + Empty states, `revokeActionBase`
form posts, uncontrolled Base UI checkbox groups):

- `types.ts` — `IntegrationClient`, `WebhookEndpoint`, `WebhookDelivery`,
  `ImportJob`, `ImportRowPreview`, `UnmappedField`, `MetricsSummary` exactly per
  contract.
- `integration-client-list.tsx` — name, per-scope badges, last-used day
  (`—` when `null`), Active/Revoked badge; revoke `<form method="post">` to
  trimmed `revokeActionBase/<encoded id>` only when `canEdit` and not revoked.
- `integration-scope-picker.tsx` — uncontrolled checkbox group named `scopes`
  over `projects:read|projects:write|time:read|time:write|webhooks:manage`
  with per-scope descriptions; `defaultSelected` prop.
- `one-time-secret.tsx` — client component; shows the secret once in `<code>`,
  copy button (`Copied` confirmation via `navigator.clipboard`), and the text
  "Copy the secret now — it will not be shown again."
- `webhook-endpoint-list.tsx` — url (mono, break-all), Enabled/Disabled badge,
  event count ("N event(s)" + Signed/Unsigned), consecutive-failure count with
  `text-destructive` flag at ≥ 5.
- `webhook-event-picker.tsx` — uncontrolled checkbox group named `eventTypes`
  from provided `options`; fallback text with no options.
- `webhook-delivery-table.tsx` — columns Event type / Status / Response /
  Attempt / Next attempt; status badges, `—` for null response/next-attempt,
  UTC `formatDay + HH:MM` times, empty state.
- `import-job-list.tsx` — source/status labels (`IMPORT_JOB_SOURCE_LABELS`,
  `IMPORT_JOB_STATUS_LABELS`), counts line, created day, empty state.
- `import-preview-table.tsx` — stable invalid-first sort, Row/Title/Status/
  Errors columns, per-row error `<ul>`, `—` for null title / no errors.
- `unmapped-fields-table.tsx` — Source/Field/Occurrences columns keyed on
  `source:field`, empty state.
- `metrics-summary-panel.tsx` — per-window sections (24h/7d) with
  automation/webhook/import totals; exported `formatFailureRate(total, failed)`
  uses integer maths only (`Math.round(failed*1000/total)` split into
  whole/decimal) with one decimal, `—` when total is 0.

## Exports

`package.json` gained explicit subpaths `./platform/types`,
`./platform/integration-client-list`, `./platform/integration-scope-picker`,
`./platform/one-time-secret`, `./platform/webhook-endpoint-list`,
`./platform/webhook-event-picker`, `./platform/webhook-delivery-table`,
`./platform/import-job-list`, `./platform/import-preview-table`,
`./platform/unmapped-fields-table`, `./platform/metrics-summary-panel`.

## Tests

Co-located `*.test.tsx` beside each component, **62 `it()` blocks** (floor 55).
Picker tests query the Base UI hidden native inputs
(`input[type="checkbox"][name=…]`) and `getByRole('checkbox', { name })`,
matching the `instantiate-options` precedent (the `button[role=checkbox]` root
itself carries no `name` attribute).

## Verify

- `pnpm --filter @876/projects-ui typecheck` — clean.
- `pnpm --filter @876/projects-ui test` — 68 files / 755 tests, all passing.
- No `eslint-disable` / `as any` / `@ts-ignore`; only `packages/projects-ui/**`
  touched; nothing committed.
