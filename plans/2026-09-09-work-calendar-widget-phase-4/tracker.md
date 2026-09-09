# 876 Work / Calendar Widget — Phase 4 Tracker

Run ID: `2026-09-09-work-calendar-widget-phase-4`

Branch: `feat/work-widget-phase-4`

Snapshot base: `feat/work-widget-phase-3@0efd0d59f`

Plan: `plans/2026-09-09-work-calendar-widget-phase-4/plan.md`

Status: `READY_FOR_SONNET_HANDOFF; IMPLEMENTATION_NOT_STARTED`

## Handoff rule

This branch is currently a planning/staging branch only.

The local orchestrator has reconciled and reviewed Phase 3. This Phase 4 branch contains that verified baseline plus planning documents only. Sonnet must not begin Phase 4 implementation until the user explicitly starts the implementation run.

When implementation resumes:

1. pull/read the latest Phase 4 branch state and Sonnet brief first;
2. preserve orchestrator changes as authoritative unless a concrete defect is found;
3. compare the implementation against this plan rather than blindly replaying old commits;
4. update this tracker only for work actually present on the refreshed branch;
5. do not edit or overwrite the Phase 3 branch.

## Phase 3 readiness for the local orchestrator

These items are intentionally recorded now so Phase 3 can be made compatible before the Phase 4 implementation run. They are not permission to prematurely implement Phase 4 context behavior.

### Recommended to land in Phase 3 if time permits

- [x] Change **user-facing** widget vocabulary away from implying that the compact widget is the entire `876 Work` product. The display name is now `876 Calendar`.
- [x] Keep internal widget ID `work`, `platform-widgets-work`, `invoice-widgets-work`, persisted preferences and feature keys stable.
- [x] Update new comments/docs to say the Calendar widget is **powered by / consumes 876 Work** rather than saying the widget owns Work.
- [x] Preserve task `links[]`, `assignments[]`, legacy context projection, event/reminder context, task-list identity, calendar identity/subscription semantics, stable UIDs, recurrence IDs and IANA timezone fields at the Work contract boundary.
- [x] Keep `@876/work-ui` controlled/transport-free: no host imports, route parsing, fetch, service keys or persistence.
- [x] Keep browser Work traffic on host-owned same-origin routes; do not expose `WORK_API_URL`, Work `/v1` routes, app keys or `WORK_INTERNAL_KEY`.
- [x] Keep acting user/organization identity server-owned and canonical-schema validated after injection.
- [x] Keep My Work user-centric without introducing the assumption that all Work resources are permanently user-only.
- [x] Keep ephemeral calendar UI selection separate from canonical Work calendar subscription/visibility state.
- [x] Preserve Phase 3 stale-data, request-generation, load-more race and truthful-retry behavior.
- [ ] If task/detail presentation is already being edited, optionally show safe linked-resource label/navigation metadata without treating it as authorization.
- [x] Keep Chat persistence/threads/messages outside Work.
- [x] Keep automatic business messaging/workflows outside Work; only human follow-up/action belongs naturally in Work.

### Must NOT be pulled into Phase 3 just for readiness

- [x] No `My Work` / `This Invoice` / `This Request` context scope selector yet.
- [x] No generic browser-supplied host resource context query.
- [x] No Invoice/CRM/Couriers contextual adapters yet.
- [x] No third context/link schema.
- [x] No destructive context persistence migration.
- [x] No recursive customer/invoice/request graph rollup.
- [x] No shared-calendar ACL/admin implementation solely for readiness.
- [x] No full assignment/delegation UI solely for readiness.
- [x] No Google/Microsoft/CalDAV OAuth/sync implementation solely for readiness.
- [x] No Chat migration.
- [x] No standalone Work app implementation.
- [x] No task delete UX.

### Phase 3 handoff checks Sonnet will preserve while implementing Phase 4

- [x] Compact widget terminology reflects its bounded Calendar/Tasks/Reminders surface rather than the entire Work service.
- [x] Internal IDs/slugs remain compatible.
- [x] No duplicate context model was introduced.
- [x] `@876/work-ui` remains transport-free.
- [x] Host/browser transport remains same-origin.
- [x] Canonical Work schemas still validate transformed host mutations after authority injection.
- [x] Work task links/assignments and event/reminder contexts are still available.
- [x] Work calendar/subscription ownership remains canonical.
- [x] No CRM request registry/state was copied into Work.
- [x] Phase 3 race/stale/error guarantees remain intact.

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

- [x] Local orchestrator refreshed Phase 4 onto the reviewed Phase 3 head.
- [ ] Sonnet reads the refreshed branch, plan, tracker, and implementation brief.
- [ ] Source implementation begins only after that review.
- [ ] Maintain per-phase source tracker while implementing.
- [ ] Run local typecheck/tests/build/browser/CI through the shell-capable orchestrator; Sonnet must not claim unobserved execution.
- [ ] Write a final Sonnet report only after source implementation is actually complete.
- [x] No Phase 4 PR opened and no Phase 4 production source implementation started during preparation.
