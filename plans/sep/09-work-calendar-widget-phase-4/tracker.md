# 876 Work / Calendar Widget — Phase 4 Tracker

Run ID: `2026-09-09-work-calendar-widget-phase-4`

Branch: `feat/work-widget-phase-4`

Snapshot base: `feat/work-widget-phase-3@0efd0d59f`

Plan: `plans/2026-09-09-work-calendar-widget-phase-4/plan.md`

Status: `IMPLEMENTED; VERIFIED; READY_FOR_PR`

## Completion summary

Phase 4 implements the Invoice pilot over the reviewed Phase 3 baseline. The
browser uses invoice-owned nested routes, the host reconstructs and authorizes
the invoice context, Work requires all aggregate read permissions, and
contextual task creation persists its primary link and assignee atomically.
Customer, CRM, and Couriers expansion remains intentionally deferred.

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

## Phase 4A — identity and compatibility — complete

- [x] Use the user-facing widget name `876 Calendar`.
- [x] Audit current widget ID `work`, display name, platform feature slugs and host feature slugs.
- [x] Keep persisted internal IDs/slugs stable.
- [x] Stop describing the compact widget as the entire Work product in new docs/code.
- [x] Preserve a future standalone Work app/product boundary.

## Phase 4B — canonical host context — complete

- [x] Define one optional host-resource reference adapter based on existing WorkContext / WorkTaskLink vocabulary.
- [x] Avoid introducing a third competing context model.
- [x] Use canonical semantics: `service`, `resource`, `externalId`, optional safe `label`/`url`.
- [x] Keep display metadata non-authoritative.
- [x] Do not inspect Invoice/CRM/Couriers URL structures inside `@876/widgets`.
- [x] Add contract/compatibility/adversarial tests.

## Phase 4C — host -> widget context pipeline — complete

- [x] Host page resolves and authorizes its resource.
- [x] Host constructs the trusted Work resource reference.
- [x] Pass optional context through host shell -> `SharedWidgetDock` -> Calendar widget.
- [x] No-context pages remain fully supported.
- [x] Add a scope selector rather than creating resource-specific top-level widget tabs.
- [x] Preserve Today/Tasks/Calendar/Create navigation inside each scope.
- [x] Preserve Phase 3 stale-data/error/race protections.

## Phase 4D — context-scoped reads — complete

- [x] Add Work reads for directly linked context resources.
- [x] `My Work` remains user-centric.
- [x] Context scope shows Work directly linked to the active host resource, subject to authorization.
- [x] Do not require context work to be assigned to the current user.
- [x] Work never queries CRM/Billing/Couriers databases.
- [x] Do not recursively traverse host relationships.
- [x] Add host permission + Work permission AND-gate tests.

## Phase 4E — contextual create — complete

- [x] Personal/no-context Task/Event/Reminder creation remains first-class.
- [x] Contextual creation attaches trusted active context where canonical Work contracts support it.
- [x] UI/browser never owns organization/user authority or authoritative host identity.
- [x] Host route injects acting-user + trusted context.
- [x] Validate transformed payloads with canonical `@876/work` schemas before calling Work.
- [x] Keep `@876/work-ui` transport-free and controlled.

## Phase 4F — Invoice pilot — complete

- [x] Implement `This Invoice` first.
- [x] Construct context only after Invoice has loaded and authorized the invoice.
- [x] Show directly linked Work without copying invoice state into Work.
- [x] Support contextual create through same-origin bounded host routes.
- [x] Preserve ordinary My Work mode.
- [x] Add feature/permission/route/browser/component regressions.

## Phase 4G — Customer and CRM contexts — deferred

- [ ] Add direct `This Customer` context where useful; no recursive business rollup inside Work.
- [ ] Add CRM Request context using request ID plus safe number/label/link metadata only.
- [ ] Do not move request CRUD/history/notes/routing/workflows into Work.
- [ ] Support human Work such as document retrieval/upload, record review, follow-up and message preparation.
- [ ] Use canonical Work assignment data for responsible users/teams.
- [ ] Keep automatic CRM messaging/business automation outside Work.

## Phase 4H — Couriers and additional hosts — deferred

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
- [x] Sonnet read the refreshed branch, plan, tracker, and implementation brief.
- [x] Source implementation completed on the Phase 4 branch.
- [x] Maintain per-phase source tracker while implementing.
- [x] Run the Phase 4 typecheck, test, browser, build, and repository contract checks.
- [x] Complete remediation and strict maintainability review.
- [x] Record verification and the one unrelated repository-wide Invoice lint baseline in the closeout report.
