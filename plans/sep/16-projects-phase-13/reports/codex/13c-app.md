# Report 13c — Projects app: blueprints, automation rules, runs, notifications

## Scope
- Touched only `apps/projects/**`. No commit/branch/push. No `eslint-disable` / `as any` / `@ts-ignore` (none added; `as` casts used are narrow type assertions, verified via grep). No run logs left in the tree (`/tmp` logs only).
- Note: `git status` also shows `packages/projects-ui/src/collaboration/` from a parallel lane; none of those paths are mine.
- Added the three missing service-tier getters (`workflows`, `automationRules`, `notifications`) to `apps/projects/src/lib/services/projects.ts`; the underlying `@876/projects` client already exposed those resources.

## Delivered — API routes (`src/app/api`)
- `workflows/[workItemTypeId]/blueprint/route.ts` — `GET` (`projects.view`) / `PUT` (`projects.edit`); strips editor row `id`s and applies service defaults on save; 404 on `work-item-type-not-found`, else 400; 422 on invalid body.
- `automation-rules/route.ts` — `GET` (`projects.view`) / `POST` (`projects.edit`, 201); shared Zod contract in `src/lib/automation-inputs.ts` mirroring the service discriminated action union.
- `automation-rules/[ruleId]/route.ts` — `GET` / `PATCH` / `DELETE` (view for read, edit for writes); empty update rejected with 422; 404 on `automation-rule-not-found`.
- `automation-rules/[ruleId]/runs/route.ts` — `GET` (`projects.view`) run history.
- `automation-rules/[ruleId]/test/route.ts` — `POST` (`projects.view`) dry-run `{ subjectId, projectId? }`; 404 on rule/subject-not-found, 422 on missing subject.
- `notifications/route.ts` — `GET` (`projects.view`) scoped to `auth.userId` (no client-supplied user id is read).
- `notifications/[notificationId]/read/route.ts` — `POST` (`projects.view`); 404 on `notification-not-found`.
- `issues/[issueRef]/route.ts` — update schema gains optional `comment` (trimmed, max 10k) so transition retries can satisfy `requiresComment`; forwarded to the service in the existing spread. Browser `issuesClient.update` params type gains the same optional field.

## Delivered — Settings pages
- Registry (`settings/_lib/settings-nav.ts`): new available `Workflows` (`/settings/workflows`) under Workspace; `Automation rules` flipped planned → available with `/settings/automation`. Nav test inventory updated.
- `settings/workflows/page.tsx` — per work-item type list linking to each blueprint.
- `settings/workflows/[workItemTypeId]/page.tsx` + `_components/blueprint-form.tsx` — server loads blueprint, states, custom + system field keys, permission options; client `BlueprintForm` wraps `BlueprintEditor` and `PUT`s on save with banner `AppError` / saved confirmation.
- `settings/automation/page.tsx` + `_components/automation-rules-manager.tsx` — `AutomationRuleList` plus per-rule Enable/Disable (`PATCH enabled`) and Delete rows.
- `settings/automation/new/page.tsx` + shared `_components/automation-rule-form.tsx` — wraps `AutomationRuleEditor` (project-scope + webhook-secret inputs); editor params-shape actions are mapped to the service discriminated union on submit (`assigneeId→userId`, `message→title`, days→minute offsets); create pushes to the list.
- `settings/automation/[ruleId]/page.tsx` — edit form, `_components/automation-test-panel.tsx` (dry-run against a work item identifier showing Would-run badge, per-condition matched flags, planned action labels), and `AutomationRunTable` run history.
- Mappers in `src/lib/automation-mappers.ts` (service ↔ editor shapes both directions) and `src/lib/notification-mappers.ts` (service → `NotificationList` shape, unread count).

## Delivered — Notifications shell + page
- `components/shell/notification-bell.tsx` — link with server-rendered unread badge (capped `99+`, labelled for AT). Rendered in the topbar icon cluster via a new optional `notificationCount` shell prop; `(app)/layout.tsx` resolves the count server-side per request (unread = `readAt === null`, failures → 0). No polling.
- `(app)/notifications/page.tsx` + `_components/notifications-manager.tsx` — server list adapted to `NotificationList`; client per-item and mark-all-read with banner `AppError` on failure.

## Delivered — Transition-aware state changes
- `features/projects/components/issue-status-select.tsx` — detail-page status control: on `projects/transition-requirements-unmet` / `projects/transition-not-allowed` shows a local form `AppError` beside the select; requirements-unmet additionally offers a comment field with Retry-with-comment / Cancel.
- `features/projects/components/board-drag-board.tsx` — status-grouped board with HTML5 drag-and-drop plus an accessible per-card move control; same local `AppError` + comment-retry treatment on transition failures. `board-data.tsx` uses it for `status` grouping, static `IssueBoard` otherwise. `issue-detail-data.tsx` mounts the status select when `canEdit` (existing detail test mock extended with `workflowStates` + `useRouter`).

## Browser clients
- `src/lib/client/workflows.ts`, `automation.ts`, `notifications.ts` (same-origin `/api` wrappers, exported from `src/lib/client/index.ts`).

## Verification (each run separately, in order)
- `pnpm --filter @876/projects-app typecheck` — clean.
- `pnpm --filter @876/projects-app lint` — 0 errors (4 pre-existing `window.location.assign` warnings elsewhere; none from this lane).
- `pnpm --filter @876/projects-app test` — 193 files, **1290 passed**, including **76 new `it()`** across 17 new test files (blueprint route 8, automation-rules route 7, rule-by-id route 9, runs 3, test 4, notifications 3, notification-read 3, mappers 10, browser clients 6, status select 5, drag board 3, notifications manager 3, bell 2, blueprint form 2, rule form 2, rules manager 3, test panel 3). Floor 45 met.
- `node scripts/check-app-structure.mjs projects` — OK.
- `pnpm check:rsc-boundaries` — OK (10 apps).

## Caveats / follow-ups
- The service error `param` (missing field list) is dropped by the typed client envelope (`{code, message}`), so the UI surfaces the server message plus a comment/fields retry path rather than an itemised missing-field list; itemised listing needs the param plumbed through `@876/projects` (out of lane scope).
- `AutomationRuleList` rows and the manager rows both link rule names (test asserts via `getAllByText`); visually the manage section sits below the rich list.
- Board drag uses native HTML5 DnD (desktop); the per-card move select is the touch/keyboard path.
