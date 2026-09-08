# Implementation Plan: 876 Work Widget Phase 2

Run ID: `2026-09-08-work-widget-phase-2`

Branch: `feat/work-widget-phase-2`

Base: `main@03366b461010f00ca0fdccb305ea8c45740ce397`

Status: `IN_PROGRESS`

## Overview and objectives

Add the minimum shared Work widget plumbing needed to prove the complete
Invoice → same-origin route → `@876/work/session` → Work API path on top of the
widget-host foundation that already landed on `main`.

This phase deliberately stops before the full calendar/task/reminder product UI.
The success condition is that an entitled Invoice user can open an `876 Work`
widget, load a real `My Work` read model through the correct session authority,
and receive a scoped in-widget loading/error/summary state without exposing
Work service topology or credentials to the browser.

## Architectural scope and invariants

- `packages/widgets` owns Work widget registration, visual identity, renderer
  registration, and host feature dependencies. It does not own Work data.
- The Work widget is `distribution: 'shared'`, `dataOwner: 'external'`, and
  organization-owned. No Work record is copied into Widgets Postgres.
- `packages/work` remains the owner of Work contracts and server clients. Add a
  browser-safe host adapter only if reuse justifies it; do not teach
  `@876/work-ui` about transport or host routes.
- `packages/work-ui` owns reusable Work presentation. Phase 2 may add only the
  minimal summary/loading/error surface needed to prove the integration; richer
  Today/Tasks/Calendar UI belongs to Phase 3.
- Invoice uses Work's `session` tier: `INVOICE_API_876_KEY` plus the request's
  signed-in bearer token. Invoice must never receive or use `WORK_INTERNAL_KEY`.
- Browser-visible routes use Invoice product vocabulary. Do not add
  `/api/work/*`, `/api/v1/*`, or another service/version namespace. The initial
  proof route is `/api/my-work`.
- Work API remains the final authorization boundary. Invoice permissions and
  feature flags are AND gates, not substitutes for Work authorization.
- Feature evaluation fails closed. Work service failures are contained inside
  the widget and must not take down the Invoice shell.
- Phase 1 Billing/Invoice widget-host behavior and Billing Notepad/Chat behavior
  must remain unchanged.
- No Work API Prisma/schema/migration changes are expected in this phase.
- No Invoice→Work service/integration provisioning dependency is added in this
  phase. The signed-in session path does not require an app Work connection.

## Key design decisions

1. Register `workWidgetMetadata` in the shared widget catalog with Invoice as
   the first implemented host and a wider metadata-driven panel width.
2. Seed `platform-widgets-work` and `invoice-widgets-work`, both disabled by
   default unless the existing seed contract requires inherited state. The
   child is effective only when both platform/app widget masters are enabled.
3. Extend the canonical Invoice permission catalog with Work resource
   permissions required by the Work session API: tasks, reminders, events,
   calendars, and `my-work.view`. Existing standard-role seeding then grants
   view actions to Staff, non-destructive actions to Admin, and the full catalog
   to Super Admin without a second hand-written role list.
4. Add a request-scoped `apps/invoice/src/lib/services/work.ts` using
   `create876WorkSessionClient` from `@876/work/session` and the existing Invoice
   session/access-token helpers.
5. Expose a thin Invoice `GET /api/my-work` route. It authenticates, resolves
   the active organization and Work widget feature gate server-side, calls the
   Work session client exactly once, and returns the standard app envelope.
6. Keep the first widget panel intentionally small: load a bounded current-day
   My Work window and render exact counts for tasks, reminders, events, and
   overdue tasks. Phase 3 owns the detailed agenda, calendar grid, quick-create,
   and mutations.
7. Reuse existing Work result schemas/types and existing widget loading/error
   primitives. Do not restate Work contracts inside Invoice or Widgets.

## Dispatched briefs

None. This run is being implemented directly by GPT Web through the GitHub
connector.

## Execution reports

| Delegate | Report |
| --- | --- |
| GPT Web | Pending: `./reports/gpt-web/2026-09-08-work-widget-phase-2.md` |

## Task checklist

- [x] Cut `feat/work-widget-phase-2` from the Phase 1 merge commit on `main`.
- [x] Read `CLAUDE.md`, `.agents/rules/gpt-web-operating-rules.md`, and relevant
      code-quality, naming, types, testing, error, access, SDK, app-routing,
      feature-flag, app-structure, shared-UI, data-fetching, performance, git,
      and implementation-tracker rules.
- [x] Verify the landed Phase 1 widget-host foundation on the new branch.
- [ ] Inspect exact Work My Work contract, Invoice context/auth helpers, current
      feature tests, access catalog tests, widget tests, and package exports.
- [ ] Register the shared Work widget and add widget catalog/rendering tests.
- [ ] Add platform + Invoice Work widget feature seeds and feature-resolution
      tests.
- [ ] Add Invoice Work permission catalog entries and role/catalog regression
      tests.
- [ ] Add Invoice's request-scoped Work session client and environment config.
- [ ] Add the thin same-origin `/api/my-work` route with authorization/error
      tests.
- [ ] Add the browser-safe Work host adapter at the canonical owner if needed.
- [ ] Add the minimal reusable Work summary panel and register it in the shared
      widget dock.
- [ ] Update Invoice package dependencies and lockfile only where genuinely
      required by workspace dependencies.
- [ ] Review the complete branch diff for duplicate contracts/helpers, hidden
      authority, swallowed errors, unsafe casts/disabled lint, service namespace
      leakage, and Phase 3 scope creep.
- [ ] Record verification commands and explicitly mark them not executed in the
      GPT Web report because this connector has no shell/test runner.
- [ ] Update this plan to `COMPLETED ✅` with exact handoff state.

## Verification commands

The orchestrator/local agent should run at minimum:

```bash
pnpm exec prettier --check \
  packages/widgets/src/catalog.ts \
  packages/widgets/src/react/widget-dock.tsx \
  packages/work/src/browser/my-work.ts \
  packages/work-ui/src/work-summary.tsx \
  apps/api/src/seeds/features.ts \
  packages/core/src/access/catalogs.ts \
  apps/invoice/src/lib/features.ts \
  apps/invoice/src/lib/services/work.ts \
  apps/invoice/src/app/api/my-work/route.ts \
  apps/invoice/.env.example \
  apps/invoice/package.json

pnpm --filter @876/widgets typecheck
pnpm --filter @876/widgets test
pnpm --filter @876/work typecheck
pnpm --filter @876/work test
pnpm --filter @876/work-ui typecheck
pnpm --filter @876/core typecheck
pnpm --filter @876/core test
pnpm --filter @876/api typecheck
pnpm --filter @876/api test -- src/seeds/features.test.ts src/seeds/app-access.test.ts
pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app test
pnpm --filter @876/invoice-app build
pnpm check:transpile
pnpm check:service-bundle
```

Exact file/test lists will be tightened as implementation settles.

## Multi-session continuity and handoff state

Phase 1 is already merged to `main` as PR #520. The new branch starts exactly at
that merge commit. Invoice already has `WidgetHost` support, generic
`resolveEnabledWidgetIds('invoice', enabledSlugs)`, generic
`widgets.enabledWidgetIds`, and conditional `SharedWidgetDock` mounting.
`SharedWidgetDock` already derives numeric panel widths from widget metadata.
Do not redo that work.

The next implementation step is to inspect the concrete My Work response shape,
Invoice auth/context helpers, and nearby tests before writing Work widget code.

## PR preparation summary

Pending implementation and verification. No PR should be opened unless the user
explicitly requests one.
