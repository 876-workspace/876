# Brief 4b — Projects app: relationships & dependencies UI

Repo `/root/projects/876`, branch `feature/projects-phase-4-dependencies`. Read `plans/2026-09-15-projects-phase-4/plan.md` (binding).
Hard rules: no commit/branch/prisma. No `eslint-disable`/`as any`/`@ts-ignore`. No server actions. No run logs. One verification command at a time. Read budget: only the files named here.

Patterns to copy (read these only):
- route handler: `apps/projects/src/app/api/task-lists/route.ts` and `api/task-lists/[taskListId]/route.ts`
- browser client: `apps/projects/src/lib/client/task-lists.ts`
- detail data loader: `apps/projects/src/app/(app)/issues/[issueRef]/_components/issue-detail-data.tsx`
- form/controls: `apps/projects/src/features/projects/components/task-list-form.tsx`
Server client verbs already exist in `@876/projects`: `projects.issueRelations.*` and `projects.issueDependencies.*` — read `packages/projects/src/resources/issue-relations.ts` and `issue-dependencies.ts` for exact signatures, and `packages/projects/src/types.ts` for the types.

## Deliver (you own only these files)
1. Route handlers (authorize with `requireApiAccess({ module: 'issues', permission: 'issues.view' | 'issues.edit' })`, strict zod, actor from auth):
   - `app/api/issues/[issueRef]/relations/route.ts` (POST), `.../relations/[relationId]/route.ts` (DELETE)
   - `app/api/issues/[issueRef]/dependencies/route.ts` (POST), `.../dependencies/[dependencyId]/route.ts` (PATCH, DELETE)
   - `app/api/issues/[issueRef]/dependencies/schedule-suggestion/route.ts` (POST)
2. Browser client `apps/projects/src/lib/client/issue-links.ts`.
3. UI on the work-item detail page: `features/projects/components/issue-links-panel.tsx` (client) + `issue-links-data.tsx` (async server, loads relations and dependencies and the linked items' identifiers/titles). Show two sections — "Relationships" (relates to / duplicates / blocks / blocked by, each row linking to `/issues/<identifier>` with a remove action) and "Dependencies" (predecessors and successors, showing type and lag, with add/edit/remove). Adding a link uses a work-item picker (search by identifier or title through the existing issues list verb). Mount it inside `app/(app)/issues/[issueRef]/_components/issue-detail-data.tsx` in its own `<Suspense>` so it never blocks the existing detail content.
4. Planned schedule fields on the work-item form (`features/projects/components/issue-form.tsx`): planned start, planned finish, planned duration (minutes). Send them through the existing issue create/update routes — extend those zod schemas to accept the three fields.
5. A "Suggest from dependencies" action in the dependencies section that calls the schedule-suggestion route and fills the planned start/finish inputs. It must never save on its own; the user still submits the form.
6. Show a "Blocked" badge on the work-item detail header when `issue.blocked` is true.
7. Tests, floor ≥ 22 `it()`: each route handler (403 unauthorized, 422 invalid body, success envelope, actor binding), the panel rendering both sections, remove action calls the client once with the right id, the suggestion action fills inputs without saving, and the blocked badge. Component tests need `/** @vitest-environment jsdom */`.

## Verify
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
node scripts/check-app-structure.mjs

## Report
`plans/2026-09-15-projects-phase-4/reports/command-code/4b-app.md`: files, counted tests, decisions, unverified items.
