# 876 Work / Calendar Widget Phase 5 report

Date: 2026-09-09

Branch: `feat/work-widget-phase-5`

Baseline: `main@1c71d404b06755bc574bad121f270adfa188c68f`

Reviewed implementation head: `b3f31929a`

## Outcome

Phase 5 is complete. The Invoice-hosted Work widget now exposes recurring work, task assignments and self-response, event participants and RSVP, user-owned alerts, calendars and subscriptions, task lists, and a focused management view without moving persistence, scheduling, identity, or authorization into the widget.

## Architecture and authorization

- Work API remains the owner of productivity data, recurrence lifecycle, and notification outbox behavior.
- `@876/work` provides canonical schemas, session methods, and a same-origin browser adapter.
- Invoice BFF routes authorize the active organization and optional invoice context before calling Work, inject acting-user fields on the server, and reject browser-supplied authority fields.
- Contextual subresources verify that their parent task, event, or reminder belongs to the authorized invoice.
- Assignment and invitation management grants are separate from self-response grants. Existing Invoice roles are backfilled by the identity API migration.
- Self-response writes use conditional repository updates keyed by parent, target identity, and observed status so a concurrent reassignment or lifecycle change cannot turn a stale authorization read into a write.

## Product surface

- Controlled, transport-free recurrence, assignment, participant, alert, calendar/subscription, and task-list components live in `@876/work-ui`.
- The compact widget exposes advanced task and schedule controls plus a dedicated Manage view while retaining My Work/invoice context isolation.
- Top-level views support `Alt+1` through `Alt+5` when available and ignore shortcuts while the user is typing.
- Month and week date controls use roving tab stops and support arrow, Home, and End navigation.
- Destructive task deletion remains outside the compact widget.

## Review fixes

- Restored missing canonical type exports and compatibility with Billing's forward-compatible Invoice resource shape.
- Isolated new cross-module dependencies in Work API unit tests so tests do not initialize Prisma.
- Removed browser update methods that targeted nonexistent generic event/reminder item routes; recurrence uses the implemented parent-owned commands.
- Replaced an unsupported Zod `.omit()` on a refined schema with an explicit browser-safe participant discriminated union, allowing Next production route collection to complete.
- Made retry callbacks total and kept legacy widget tests scoped to rendered task content after advanced selectors introduced duplicate labels.

## Verification

Passed locally:

- `@876/work`: typecheck; 23 files / 243 tests.
- `@876/work-api`: typecheck; lint with two pre-existing warnings and no errors; 26 files / 570 tests; production build.
- `@876/work-ui`: typecheck.
- `@876/widgets`: typecheck; 16 files / 150 unit tests; 8 files / 12 Chromium browser tests.
- `@876/invoice-app`: typecheck; 70 files / 481 tests; Next production build with all advanced API routes collected.
- Repository shared-UI transpilation/Tailwind-source checks.
- Repository service-bundle check for inlined `@876/*` dependencies.

`@876/work-api` has no package-local `boundaries` script. The invalid plan command was removed; the repository service-bundle and shared-package boundary checks above were executed successfully.

## Deferred

- Single-occurrence recurrence exceptions/edit-one commands.
- Google, Microsoft, and CalDAV OAuth/synchronization (Phase 6).
- Standalone Work product/admin experience (Phase 7).
- Full workload/resource planning and recursive cross-product relationship traversal.
