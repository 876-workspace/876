# Implementation Plan: 876 Work Widget and Calendar Surface

Run ID: `2026-09-08-work-widget-phase-2`

Branch: `feat/work-widget-phase-2`

Base: `main@03366b461010f00ca0fdccb305ea8c45740ce397`

Status: `PHASE_2_READY_FOR_PR`

## End goal

Build 876 Work into the shared productivity plane and interaction surface for the
876 ecosystem: one canonical place for tasks/todos, calendars, calendar events,
reminders, recurrence, alerts, assignment/delegation, and a user's cross-product
agenda.

The primary embedded experience is a shared `876 Work` widget that can appear in
eligible 876 product apps without duplicating Work data into the Widgets bounded
context. It should feel like a compact combination of Google Calendar and a
modern todo application: a unified Today agenda, responsive day/week/month
calendar views, task lists, reminders, quick-create, and contextual work attached
to the resource the user is currently viewing.

The same reusable Work UI should later support a full standalone 876 Work surface
without rewriting the product logic. Work remains the source of truth; host apps
only provide authenticated access, rollout/access gates, and optional opaque
context such as an invoice, customer, request, or package.

### Target end-state capabilities

- One shared `876 Work` widget in supported 876 hosts.
- `Today` / `My Work` agenda combining events, tasks, reminders, and overdue work.
- Task/todo lists with due/start dates, importance, recurrence, assignments, and
  completion lifecycle.
- Day, week, and month calendar views backed by canonical Work calendars/events.
- Standalone reminders and per-resource/event alerts.
- Unified create/edit flows for Event, Task, and Reminder.
- Context-aware Work views for host-owned resources using opaque Work links.
- Responsive small/medium/large widget layouts plus a pop-out/full Work surface.
- Calendar subscriptions and participant management.
- External calendar synchronization through the existing Work provider boundary
  for Google, Microsoft, and CalDAV without storing raw OAuth credentials in the
  ordinary Work database.
- Shared presentation in `@876/work-ui`; Work transport/contracts in `@876/work`;
  widget integration in `@876/widgets`; no duplicate productivity persistence in
  `apps/widgets-api`.

## Architectural scope and invariants

- `apps/work-api` owns canonical Work persistence and business behavior.
- `packages/work` owns Work contracts and caller-tier clients.
- `packages/work-ui` owns reusable, controlled Work presentation and must remain
  transport/provider agnostic.
- `packages/widgets` owns Work widget registration, visual identity, renderer
  registration, panel metadata, and host feature dependencies. It does not own
  Work data.
- The Work widget is `distribution: 'shared'`, `dataOwner: 'external'`, and
  organization-owned. No Work record is copied into Widgets Postgres.
- Browser traffic reaches Work through the current host's same-origin route and
  the appropriate bounded Work client. Browser code does not learn service
  topology, app API keys, or internal keys.
- Product apps use Work's session/integration authority as appropriate. They
  must never use `WORK_INTERNAL_KEY` for user-facing Work widget traffic.
- Work API remains the final authorization boundary. Host permissions, product
  entitlement/module state, and feature flags are additional AND gates, not
  substitutes for Work authorization.
- Feature evaluation fails closed. Work failures stay inside the Work surface and
  must not take down a host application's shell.
- Context linkage is opaque (`service`, `resource`, `externalId`); Work does not
  create cross-database foreign keys to Billing, CRM, Couriers, or other apps.
- Tasks are the canonical todo primitive. Do not create a parallel Todo resource.
- `My Work` is a read model over canonical Work records, not duplicate storage.
- Host/product vocabulary is preserved at the browser boundary; do not leak
  `/v1`, internal service names, or credentials into frontend APIs.
- Future standalone 876 Work entitlement is distinct from the Work service
  infrastructure needed by other product apps.

## Key design decisions

1. Build one shared `876 Work` widget instead of separate Calendar, Tasks, and
   Reminders widgets. The widget exposes modes over one canonical productivity
   plane.
2. Keep Work as `dataOwner: 'external'`; Widgets only owns catalog/host/runtime
   integration.
3. Reuse `WorkTask` as the todo primitive and `WorkTaskList` as todo lists.
4. Treat events as duration blocks, timed tasks as task chips, due-only tasks as
   task/all-day items, and reminders as lightweight markers rather than fake
   duration events.
5. Use `My Work` for the default Today/agenda read path and canonical Work
   resources for deeper calendar/task/reminder screens and mutations.
6. Keep shared Work UI in `@876/work-ui`; widget and future standalone Work app
   consume the same components.
7. Make small widget layouts agenda-first. A full desktop calendar grid only
   appears when panel size supports it; medium month mode uses a compact month
   selector plus selected-day agenda where appropriate.
8. Host apps may pass optional opaque context to support `My Work` versus
   `This Invoice`, `This Customer`, `This Request`, or `This Package` without
   introducing host-domain knowledge into Work UI.
9. External provider sync is an adapter concern behind Work's provider contract.
   Google/Microsoft/CalDAV synchronization comes after the canonical internal UX
   is complete.
10. Roll out host by host. Metadata may describe future support, but
    `implementedHosts` and feature gates must only advertise actually wired
    hosts.

## Phase tracker

### Phase 1 — Shared widget host foundation — `COMPLETED`

Goal: make shared widgets a first-class host capability and prepare Invoice to
mount the common widget dock without building Work-specific behavior yet.

- [x] Establish shared widget-host/catalog behavior.
- [x] Support metadata-driven panel sizing.
- [x] Add Invoice as a widget-capable host.
- [x] Add generic host feature resolution for enabled widgets.
- [x] Mount `SharedWidgetDock` conditionally from the Invoice shell.
- [x] Preserve existing Billing Notepad/Chat behavior.
- [x] Merge the Phase 1 foundation to `main` in PR #520.

Acceptance: Invoice can participate in the shared widget runtime and existing
widget behavior remains compatible.

### Phase 2 — Work widget vertical slice in Invoice — `READY_FOR_PR`

Goal: prove the complete authenticated path from a shared Work widget in Invoice
to canonical Work `My Work` data, with rollout and authorization gates and no
Work persistence in Widgets.

- [x] Inspect the Work `My Work` contract and existing Work session client.
- [x] Inspect Invoice session/context helpers and existing widget host contract.
- [x] Register shared `workWidgetMetadata` as external Work-owned data.
- [x] Add Work visual/catalog exports and widget renderer registration.
- [x] Add Work widget catalog/host regression coverage.
- [x] Add platform and Invoice Work-widget feature seeds.
- [x] Add feature-resolution regression coverage.
- [x] Extend the canonical Invoice permission catalog with `my-work.view` and
      the Work actions needed by the session surface.
- [x] Add standard-role/catalog regression coverage.
- [x] Add a migration/backfill for 876-managed standard Invoice roles only,
      preserving customized/manual organization roles.
- [x] Add Invoice's request-scoped Work session client and environment config.
- [x] Add the thin same-origin `GET /api/my-work` route.
- [x] Enforce authentication, active organization, feature rollout, and
      `my-work.view` before the request reaches the Work client.
- [x] Filter the Work widget from the Invoice dock when the current member lacks
      `my-work.view`.
- [x] Add route/service authorization and error-path tests.
- [x] Add a browser-safe `@876/work/browser` host adapter rather than duplicating
      fetch/envelope behavior in the widget package.
- [x] Add minimal reusable `@876/work-ui` summary presentation.
- [x] Add the shared Work widget loading/error/summary panel.
- [x] Fix the Work widget fetch lifecycle so a successful load cannot trigger a
      repeated request loop through a data-dependent callback.
- [x] Update direct workspace dependencies in affected package manifests.
- [x] Synchronize `pnpm-lock.yaml` with the new direct workspace dependencies.
- [x] Re-review the full branch diff for duplicate contracts/helpers, hidden
      authority, swallowed errors, unsafe casts/lint suppression, service
      namespace leakage, compatibility residue, and Phase 3 scope creep.
- [x] Write the local review report under this run's `reports/` path.
- [x] Record executable verification evidence without claiming that the Core
      database migration has been applied.
- [x] Update this tracker's Phase 2 status and handoff state after closeout.

Acceptance: an enabled and authorized Invoice user can open `876 Work`, fetch
real `My Work` through Invoice's same-origin route and Work's session tier, and
receive contained loading/error/summary UI. Unauthorized or disabled users never
receive the widget/data path. No Work content is persisted by Widgets.

### Phase 3 — Interactive Today, Tasks, and Calendar UX — `NOT_STARTED`

Goal: turn the proof panel into a genuinely useful compact productivity surface.

#### 3A — Today / agenda

- [ ] Replace count-only summary with a unified Today agenda using canonical
      tasks, reminders, events, and overdue tasks.
- [ ] Reuse/extend `WorkAgenda` instead of creating a competing aggregation.
- [ ] Add date grouping, all-day handling, time display, overdue grouping, empty
      states, loading refresh, and contained retry behavior.
- [ ] Add task completion from the agenda using the canonical Work mutation path.
- [ ] Add accessible detail opening for event/task/reminder items.

#### 3B — Task/todo experience

- [ ] Add task-list navigation using `WorkTaskList`.
- [ ] Add task rows/detail surface with status, importance, start/due date,
      recurrence, assignment, and description.
- [ ] Add create/edit/complete/cancel flows through host-owned same-origin routes.
- [ ] Keep Todo as UX vocabulary only where useful; persistence remains
      `WorkTask`.

#### 3C — Calendar experience

- [ ] Build reusable calendar header/navigation in `@876/work-ui`.
- [ ] Build responsive Day view.
- [ ] Build responsive Week view.
- [ ] Build responsive Month view.
- [ ] Reuse `WorkCalendarList` for calendar selection/filtering.
- [ ] Render all-day and timed `WorkEvent` records correctly.
- [ ] Render scheduled tasks/reminders with distinct semantics from events.
- [ ] Add compact/medium calendar behavior suitable for widget widths.
- [ ] Add large/pop-out layout with mini-calendar/sidebar plus primary grid.

#### 3D — Unified create

- [ ] Add one Create entry point with Event / Task / Reminder modes.
- [ ] Event fields: title, calendar, date, start/end, all-day, recurrence,
      participants, alert, location/notes where supported by contract.
- [ ] Task fields: title, list, start/due, importance, recurrence, assignee,
      description.
- [ ] Reminder fields: title, remind-at, recurrence, note.
- [ ] Validate with shared Work schemas and preserve server-side authorization.

Acceptance: the Work widget is useful as a daily calendar/todo/reminder product,
not merely an integration proof.

### Phase 4 — Context-aware cross-product Work — `NOT_STARTED`

Goal: let Work follow the user across 876 while preserving bounded contexts.

- [ ] Define a small optional host context input using opaque Work link identity
      (`service`, `resource`, `externalId`, optional display metadata only when
      safe and necessary).
- [ ] Add widget mode switch between `My Work` and the active host context.
- [ ] Add Billing contexts for customer and invoice.
- [ ] Add CRM context for request.
- [ ] Add Couriers context for package/delivery where appropriate.
- [ ] Extend the widget-host catalog to CRM and any other host only when that
      app actually implements the runtime contract.
- [ ] Extend Invoice context beyond generic My Work where product UX benefits.
- [ ] Use canonical Work links; do not query host databases from Work.
- [ ] Add host-by-host feature flags, permissions, tests, and failure isolation.

Acceptance: users can see and create work attached to the resource they are
currently viewing without Work learning host-domain schemas or foreign keys.

### Phase 5 — Advanced productivity capabilities — `NOT_STARTED`

Goal: expose the richer capabilities already modeled by Work and close the gap
with mature calendar/todo products.

- [ ] Recurrence creation and edit semantics, including edit-one/edit-series
      behavior where the backend contract supports it.
- [ ] Assignment/delegation UI for owner/collaborator/reviewer/watcher roles.
- [ ] Assignment accept/decline/complete lifecycle where applicable.
- [ ] Event participant management and response state.
- [ ] Work alerts for absolute and relative notification/email actions.
- [ ] Calendar creation/editing and visibility controls.
- [ ] Calendar subscription management.
- [ ] Task-list management and defaults.
- [ ] Better keyboard/accessibility behaviors for calendar navigation and quick
      creation.
- [ ] Notification integration through the existing Work notification/outbox
      architecture rather than inventing widget-local reminders.

Acceptance: internal 876 Work supports the core recurring, delegated,
participant-aware productivity workflows expected from a mature calendar/tasks
surface.

### Phase 6 — External calendar synchronization — `NOT_STARTED`

Goal: connect canonical Work calendars/events to external providers without
making provider state the product model.

- [ ] Review/finalize existing Work provider interfaces for current Google,
      Microsoft, and CalDAV APIs before implementation.
- [ ] Implement secure credential resolution using opaque credential references;
      never persist raw OAuth tokens in ordinary Work records.
- [ ] Implement Google Calendar provider adapter.
- [ ] Implement Microsoft Outlook/Graph calendar provider adapter.
- [ ] Implement CalDAV provider adapter where practical.
- [ ] Implement pull synchronization and mapping persistence.
- [ ] Implement push/update/delete synchronization.
- [ ] Define conflict, retry, tombstone/deletion, and idempotency semantics.
- [ ] Surface sync connection health and last-sync state in Work settings.
- [ ] Add provider contract tests and integration fixtures.
- [ ] Add telemetry for failed/stale sync without leaking credentials/PII.

Acceptance: external calendars can synchronize through Work while Work remains
canonical for 876-owned productivity state and provider details remain behind
adapters.

### Phase 7 — Standalone 876 Work product and rollout hardening — `NOT_STARTED`

Goal: reuse the same product UI as a full Work destination and prepare broad
platform rollout.

- [ ] Decide/implement standalone `apps/work` product entitlement separately
      from service infrastructure access.
- [ ] Compose the same `@876/work-ui` Today/Tasks/Calendar components into the
      standalone app rather than forking widget UI.
- [ ] Add full-size navigation/settings surfaces appropriate to the Work app.
- [ ] Add organization provisioning/module settings only for true org-controlled
      Work behavior; keep rollout flags separate.
- [ ] Complete supported-host rollout matrix across eligible 876 apps.
- [ ] Add end-to-end host authorization/feature-flag regression tests.
- [ ] Add performance measurements for agenda and large calendar ranges.
- [ ] Add accessibility audit coverage for calendar/task interactions.
- [ ] Add operational documentation, migration/deployment order, and support
      runbook.
- [ ] Confirm production migrations/configuration separately from code presence.

Acceptance: Work is a reusable platform service, embedded widget, and optional
standalone product with one set of contracts/components and no duplicated
productivity plane.

## Dispatched briefs

None. This run is being implemented directly by GPT Web through the GitHub
connector.

## Execution reports

| Delegate | Report                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------ |
| GPT Web  | Phase 2 implementation landed through `efbb9d432`; retained Phase 3 work is preserved on the remote source branch. |
| Codex    | `./reports/codex/2026-09-09-phase-2-review.md`                                                                     |

## Verification and testing commands

Phase 2 local/orchestrator verification should include at minimum:

```bash
pnpm install --lockfile-only

pnpm exec prettier --check \
  packages/widgets/src/catalog.ts \
  packages/widgets/src/react/widget-dock.tsx \
  packages/widgets/src/react/work-widget.tsx \
  packages/work/src/browser.ts \
  packages/work-ui/src/summary.tsx \
  apps/api/src/seeds/features.ts \
  packages/core/src/access/catalogs.ts \
  apps/invoice/src/lib/features.ts \
  apps/invoice/src/lib/auth/api-permission.ts \
  apps/invoice/src/lib/services/work.ts \
  apps/invoice/src/app/api/my-work/route.ts \
  apps/invoice/.env.example \
  apps/invoice/package.json \
  packages/widgets/package.json

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

Database verification for the Phase 2 permission migration must be performed by
the environment that owns the Core database. Code presence does not prove the
migration has been applied to any deployed database.

## Multi-session continuity and handoff state

Phase 1 is merged to `main` as PR #520. This branch starts at that merge commit
and currently contains the Phase 2 Invoice vertical slice.

### Completed in the live Phase 2 branch

- Shared Work widget catalog metadata and renderer.
- Work platform/Invoice feature gates and tests.
- Invoice Work permission catalog and tests.
- Permission migration/backfill constrained to 876-managed standard roles.
- Invoice same-origin `GET /api/my-work` transport with session-tier Work client.
- Explicit Invoice route/dock permission gating via `my-work.view`.
- Browser-safe Work adapter and reusable Work summary component.
- Work widget loading/error/summary behavior and fetch-loop correction.
- Direct workspace manifest dependencies required by the new imports.

### Exact next steps

1. Commit the focused local review fixes only after explicit user approval.
2. Replace the mixed remote Phase 2 head with this clean Phase 2 history, push,
   and open the Phase 2 PR against `main`.
3. Verify mergeability, CI, top-level reviews, and every inline bot thread.
4. Apply and verify the Core permission migration in the environment that owns
   that database; source presence is not deployment evidence.
5. After Phase 2 merges, create `feat/work-widget-phase-3` from updated `main`
   and replay the retained Phase 3 implementation using
   `briefs/gpt-web/2026-09-09-phase-3.md` as the correction brief.

## PR preparation summary

The user requested a clean Phase 2 PR and a separate Phase 3 branch after Phase
2 merges. The remote source branch currently preserves both phases; it must not
be used as the Phase 2 PR head until it is replaced with this reviewed Phase 2
history. No Phase 3 implementation belongs in the Phase 2 diff.
