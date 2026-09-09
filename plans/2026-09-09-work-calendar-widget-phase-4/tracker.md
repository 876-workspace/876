# 876 Work / Calendar Widget — Phase 4 Tracker

Run ID: `2026-09-09-work-calendar-widget-phase-4`

Branch: `feat/work-widget-phase-4`

Snapshot base: `feat/work-widget-phase-3@d911eb926563f7c7caf080d378289421050f24dd`

Plan: `plans/2026-09-09-work-calendar-widget-phase-4/plan.md`

Status: `PLANNING_COMPLETE; WAITING_FOR_LOCAL_ORCHESTRATOR_BASELINE`

## Handoff rule

This branch is currently a planning/staging branch only.

The local orchestrator is expected to reconcile/land the current Phase 3 work and may then reshape or rebase this Phase 4 branch. GPT Web must not begin Phase 4 implementation until the user points back to the orchestrator-updated `feat/work-widget-phase-4` state.

When implementation resumes:

1. pull/read the latest Phase 4 branch state first;
2. preserve orchestrator changes as authoritative unless a concrete defect is found;
3. compare the implementation against this plan rather than blindly replaying old commits;
4. update this tracker only for work actually present on the refreshed branch;
5. do not overwrite Phase 3 to recover Phase 4 planning changes.

## Architecture decisions — complete

- [x] 876 Work is the canonical productivity service, not the widget.
- [x] The compact widget is only one Work consumer; working user-facing direction is a Calendar/Schedule-style `876 Calendar` surface.
- [x] A future standalone/full Work application must be possible over the same Work service without moving data.
- [x] CRM remains owner of requests/tickets, notes/history, categories, forms, routing, teams and CRM workflows.
- [x] Work does not mirror the CRM request registry.
- [x] A Work task may reference a CRM request by opaque Work link/context, including safe request number/label/navigation metadata.
- [x] A Work task may exist with no CRM, Invoice, Customer, Couriers or other host context.
- [x] Work owns task state, task lists, assignments/delegation, reminders, recurrence, alerts, calendars, subscriptions, events, participants, notification scheduling, provider-neutral sync mappings and calendar export semantics.
- [x] Host products own their business/domain records and authorize those resources.
- [x] Human follow-up/message preparation can be a Work task; actual automatic business messaging remains a host/automation/communications responsibility.
- [x] 876 Chat remains independent in Phase 4. Chat ↔ Work linking/actions may be added later without merging persistence domains.
- [x] Shared calendars must use canonical WorkCalendar + WorkCalendarSubscription state rather than widget-local shared-calendar state.
- [x] Google/Microsoft/CalDAV/iCalendar/JSCalendar compatibility remains a Work-service concern; provider OAuth/sync implementation is not required merely to complete Phase 4.
- [x] Full assignment/delegation/team-work UX is not forced into the compact widget.

## Phase 4A — identity and compatibility — planned

- [ ] Choose final user-facing widget name; current recommendation: `876 Calendar`.
- [ ] Audit current widget ID `work`, display name, platform feature slugs and host feature slugs.
- [ ] Prefer keeping persisted internal IDs/slugs stable unless an alias-safe migration is justified.
- [ ] Stop describing the compact widget as the entire Work product in new docs/code.
- [ ] Preserve a future standalone Work app/product boundary.

## Phase 4B — canonical host context — planned

- [ ] Define one optional host-resource reference adapter based on existing WorkContext / WorkTaskLink vocabulary.
- [ ] Avoid introducing a third competing context model.
- [ ] Prefer canonical semantics: `service`, `resource`, `externalId`, optional safe `label`/`url`.
- [ ] Keep display metadata non-authoritative.
- [ ] Do not inspect Invoice/CRM/Couriers URL structures inside `@876/widgets`.
- [ ] Add contract/compatibility/adversarial tests.

## Phase 4C — host -> widget context pipeline — planned

- [ ] Host page resolves and authorizes its resource.
- [ ] Host constructs the trusted Work resource reference.
- [ ] Pass optional context through host shell -> `SharedWidgetDock` -> Calendar widget.
- [ ] No-context pages remain fully supported.
- [ ] Add a scope selector rather than creating resource-specific top-level widget tabs.
- [ ] Preserve Today/Tasks/Calendar/Create navigation inside each scope.
- [ ] Preserve Phase 3 stale-data/error/race protections.

## Phase 4D — context-scoped reads — planned

- [ ] Add Work reads for directly linked context resources.
- [ ] `My Work` remains user-centric.
- [ ] Context scope means visible Work directly linked to the active host resource, subject to authorization.
- [ ] Do not require context work to be assigned to the current user.
- [ ] Work never queries CRM/Billing/Couriers databases.
- [ ] Do not recursively traverse host relationships (`This Customer` is direct customer-linked Work, not every invoice/request descendant).
- [ ] Add host permission + Work permission AND-gate tests.

## Phase 4E — contextual create — planned

- [ ] Personal/no-context Task/Event/Reminder creation remains first-class.
- [ ] Contextual creation attaches trusted active context where canonical Work contracts support it.
- [ ] UI/browser never owns organization/user authority or authoritative host identity.
- [ ] Host route injects acting-user + trusted context.
- [ ] Validate transformed payloads with canonical `@876/work` schemas before calling Work.
- [ ] Keep `@876/work-ui` transport-free and controlled.

## Phase 4F — Invoice pilot — planned

- [ ] Implement `This Invoice` first.
- [ ] Construct context only after Invoice has loaded and authorized the invoice.
- [ ] Show directly linked Work without copying invoice state into Work.
- [ ] Support contextual create through same-origin bounded host routes.
- [ ] Preserve ordinary My Work mode.
- [ ] Add feature/permission/route/browser/component regressions.

## Phase 4G — Customer and CRM contexts — planned

- [ ] Add direct `This Customer` context where useful; no recursive business rollup inside Work.
- [ ] Add CRM Request context using request ID plus safe number/label/link metadata only.
- [ ] Do not move request CRUD/history/notes/routing/workflows into Work.
- [ ] Support human Work such as document retrieval/upload, record review, follow-up and message preparation.
- [ ] Use canonical Work assignment data for responsible users/teams.
- [ ] Keep automatic CRM messaging/business automation outside Work.

## Phase 4H — Couriers and additional hosts — planned

- [ ] Add package/delivery context only where product UX benefits.
- [ ] Do not mark a host implemented before feature flags, permissions, runtime transport and failure isolation exist.
- [ ] Add host-specific rollout tests.

## Long-term calendar compatibility — preserved, not Phase 4 scope

- [x] Personal primary calendars are part of Work architecture.
- [x] Shared/organization calendars are part of Work architecture.
- [x] Per-user calendar subscriptions/preferences are separate from shared calendar metadata.
- [x] Work already has provider-neutral sync connection/mapping models.
- [x] Work already owns iCalendar/JSCalendar export semantics and stable UIDs.
- [ ] Later expose subscribe/show/hide shared calendars through canonical Work state.
- [ ] Later implement approved Google/Microsoft/CalDAV provider adapters.
- [ ] Later implement import through Work rather than widget/host-specific ICS parsers.

## Long-term full Work compatibility — preserved, not forced into widget

- [x] Work supports USER/TEAM assignments and OWNER/COLLABORATOR/REVIEWER/WATCHER roles.
- [x] Compact My Work remains centered on the current user's relevant work.
- [ ] A compact assignee picker can be considered later when people/team resolution and permission UX are mature.
- [ ] Full delegation, acceptance/decline, workload management, participant administration, sync management and advanced recurring-series management belong in a future full Work experience unless a bounded host use case requires a subset.

## Explicit Phase 4 non-goals

- [x] No CRM request registry inside Work.
- [x] No duplicate CRM request storage.
- [x] No Chat migration into Work.
- [x] No generic automation engine inside Work.
- [x] No recursive host-domain graph service.
- [x] No requirement to expose every Work API resource in one widget.
- [x] No task deletion solely because the capability exists.
- [x] No large standalone Work application disguised as a widget.
- [x] No Google/Microsoft/CalDAV OAuth implementation required to complete contextual Phase 4.

## Implementation / verification

- [ ] WAITING: local orchestrator refreshes/rebases/updates the Phase 4 branch.
- [ ] GPT Web re-reads the refreshed branch and compares it with this plan.
- [ ] Source implementation begins only after that review.
- [ ] Maintain per-phase source tracker while implementing.
- [ ] Run local typecheck/tests/build/browser/CI through the shell-capable orchestrator; GPT Web does not claim unobserved execution.
- [ ] Write final GPT Web report only after source implementation is actually complete.
- [x] No PR opened or merged by GPT Web during planning.
