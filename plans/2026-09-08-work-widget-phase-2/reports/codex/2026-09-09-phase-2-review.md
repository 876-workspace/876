# Codex Review — 876 Work Widget Phase 2

Date: 2026-09-09

Reviewed source: `feat/work-widget-phase-2` through the Phase 2 boundary at
`efbb9d432`, compared with `main@03366b461`.

## Outcome

Phase 2 is ready for a focused pull request after the local fixes are committed.
The accidental Phase 3 work remains preserved at
`origin/feat/work-widget-phase-2@c1f43471f` and is intentionally excluded from
this reviewed Phase 2 line.

## Review fixes

- Synchronized `pnpm-lock.yaml` for the new Invoice, Widgets, Work, and Work UI
  workspace dependencies.
- Corrected widget-catalog permission lookup so the literal catalog union
  typechecks without casts or weakening `WidgetMetadata`.
- Corrected the Today query to use Work's exclusive `to` boundary. Subtracting
  one second omitted the last second of the local day.
- Added regression coverage for the exclusive local-day window.
- Updated the Invoice layout test fixture to include the required widget feature
  result instead of weakening the production contract with an optional fallback.

## Architecture findings

No remaining Phase 2 blocker was found in the static review. The browser uses an
Invoice-owned `/api/my-work` route, the route authorizes before constructing the
request-scoped Work session client, Work remains the final authorization and
data boundary, feature evaluation fails closed, and Widgets stores no Work data.

The Core migration is deliberately limited to live 876-managed Invoice system
roles. Custom roles and assignment-level grants or denies are not widened.

## Verification

Observed passing during local review:

- `pnpm --filter @876/widgets typecheck`
- `pnpm --filter @876/widgets test`
- `pnpm --filter @876/work typecheck`
- `pnpm --filter @876/work test`
- `pnpm --filter @876/work-ui typecheck`
- `pnpm --filter @876/core typecheck`
- `pnpm --filter @876/core test`
- `pnpm --filter @876/api typecheck`
- `pnpm --filter @876/api test -- src/seeds/features.test.ts src/seeds/app-access.test.ts`
- `pnpm --filter @876/invoice-app typecheck`
- `pnpm --filter @876/invoice-app test`
- `pnpm --filter @876/invoice-app build`
- `pnpm check:transpile`
- `pnpm check:service-bundle`

Focused formatting passes for the changed review files. The repository-wide
`pnpm check` stops in `format:check` on the existing workspace formatting
backlog, including files unchanged by this branch, before lint/typecheck/tests
can run as one aggregate command. The focused commands above provide the branch
evidence instead. The Core database migration has not been applied or verified
by this source review.

## Phase 3 separation

The retained Phase 3 implementation must be replayed only after Phase 2 merges,
onto `feat/work-widget-phase-3` created from updated `main`. The correction brief
at `../../briefs/gpt-web/2026-09-09-phase-3.md` lists the known compile, testing,
authorization-UX, pagination, calendar, and maintainability work that must happen
before that branch is considered ready.
