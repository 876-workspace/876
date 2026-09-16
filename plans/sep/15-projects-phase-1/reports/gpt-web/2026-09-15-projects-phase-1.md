# GPT Web Completion Report — 876 Projects Phase 1 Foundation

- **Run ID:** `2026-09-15-projects-phase-1`
- **Branch:** `feature/projects-phase-1-foundation`
- **Original base:** `main` @ `a6125f2b065ae8ed45286711828b70edba332f23`
- **Implementation:** complete
- **Execution verification:** pending local/orchestrator runner

## Scope delivered

Phase 1 finishes and surfaces the Projects capabilities that already existed in
the canonical domain before adding new dependency/Gantt/time/budget models.

### Work-item detail

`IssueDetail` now presents:

- configured work-item type;
- configured workflow-state name;
- milestone;
- resolved parent work item and child work items;
- typed custom-field values with field labels;
- organization-member display names for assignee, creator, and activity actors;
- estimate, due/start/completed/canceled/updated/created dates;
- labels;
- formatted activity history;
- existing Markdown description and comments.

Parent records are retrieved through the existing Projects issue resource rather
than displaying the internal `issue_...` id as the primary UI identity.

### Work-item create/edit

A shared issue form now owns create and edit presentation. The edit route loads
canonical work-item types, workflow states, projects, milestones, custom fields,
labels, candidate parents, and organization members before rendering.

Editable fields include title, description, project, type, workflow state,
milestone, priority, assignee, parent, estimate, due date, labels, and applicable
custom fields. Expected mutation failures remain inside the form through
`AppError`.

The browser mutation path remains:

```text
client component
  -> same-origin /api/issues[/issueRef]
  -> Projects app authorization
  -> @876/projects server client
  -> projects-api
```

No browser component calls the Projects service origin directly.

### Identity integrity hardening

During the final audit, the browser-facing issue schemas were narrowed so
server-owned identity cannot be spoofed:

- create rejects `creatorUserId` from browser input and always supplies the
  signed-in `auth.userId` to the service;
- update rejects `creatorUserId` and always supplies `actorUserId` from the
  signed-in `auth.userId`;
- the typed browser client omits `creatorUserId` and `actorUserId` from its
  accepted mutation params.

The broader service SDK keeps those fields because service/operator callers may
legitimately need them; only the session-bound app boundary is narrowed.

### List and board

The Issues list now passes URL-backed filters to the owning Projects list
operation rather than filtering a returned page in the browser. Supported UI
controls in this phase are:

- search;
- project;
- workflow state, including tenant-defined keys;
- priority;
- assignee;
- label;
- order.

List and Board presentation can group by:

- workflow state;
- project;
- priority;
- assignee;
- work-item type;
- milestone.

The Board no longer silently drops work items whose tenant-defined workflow
state is outside the six legacy preset keys. In the default workflow-state
view, the familiar six legacy columns remain visible even when empty, and
additional configured states are appended from actual issue data.

### Project workspace

Project detail now exposes a broader current-data workspace:

- status and health;
- resolved project lead;
- member count;
- customer link identifier;
- start/target/update dates;
- total work-item count from the service envelope;
- open/in-progress/completed/overdue summaries when the loaded result is known
  complete;
- project work table.

When `has_more` is true, derived subset counts are deliberately hidden instead
of presenting a partial page as whole-project analytics.

### Catalog and docs

- `comments` is corrected to `available: true` in the Projects surface catalog.
- `docs/876-projects.md` now documents the work-structure routes, current
  comments/editing surface, browser/server boundary, current filtering/grouping,
  and the Phase 2+ gaps.

## Test changes

**18 new `it()` cases** were added across new and expanded focused suites. The
seven Phase 1 touched/added test files contain **41 `it()` cases** in total:

| Test file | Current cases | Phase 1 focus |
| --- | ---: | --- |
| `apps/projects/src/app/api/issues/[issueRef]/route.test.ts` | 5 | edit authorization, strict body, identity spoof rejection, actor injection, 404 mapping |
| `apps/projects/src/app/api/projects/route.test.ts` | 16 | existing project/label coverage plus issue creator binding/spoof rejection |
| `apps/projects/src/features/projects/components/issue-form-edit.test.tsx` | 2 | edit initialization and canonical update payload |
| `apps/projects/src/features/projects/issue-filters.test.ts` | 4 | trimming, dynamic state keys, invalid values, default grouping |
| `packages/projects-ui/src/issue-board-grouping.test.tsx` | 2 | custom workflow states and resolved-assignee grouping |
| `packages/projects-ui/src/issue-detail-foundation.test.tsx` | 2 | work structure, parent/children, custom fields, identities, activity |
| `packages/projects-ui/src/project-detail.test.tsx` | 10 | expanded project overview/workspace and prior behavior |

Additional pre-existing Projects UI/client tests remain in their original
files and should run as part of the package-level suites.

## Static review findings resolved

1. **Custom workflow-state loss on Board** — fixed. The old Board hardcoded six
   status buckets and discarded unknown keys.
2. **Browser creator spoofing** — fixed. Create/update app routes and typed
   browser client now protect server-owned identity fields.
3. **Raw parent id presentation** — fixed. Parent work items resolve to their
   identifier/title and link through the normal issue route.
4. **Stale Comments availability/docs** — fixed.
5. **Project summary pagination honesty** — fixed. Derived work counts are not
   shown as totals when only a partial issue page is loaded.
6. **Client-only filter semantics** — replaced for the Phase 1 controls with
   filters sent to the canonical Projects service list operation.

## Verification not executed here

This GPT-web/GitHub-connector environment can read and write repository content
but does not provide a checked-out workspace in which pnpm, TypeScript, Vitest,
ESLint, Prettier, Prisma generation, or Next builds can be executed. Therefore
none of the commands below are claimed as passing.

Run after reconciling current `main`:

```bash
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test
pnpm --filter @876/projects lint

pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test

pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app test
pnpm --filter @876/projects-app lint

pnpm --filter @876/projects-api typecheck
pnpm --filter @876/projects-api test
pnpm --filter @876/projects-api lint

pnpm format:check
pnpm check:error-contract
pnpm check:rsc-boundaries
```

The Phase 1 implementation did not change `apps/projects-api`, but its checks
remain in the handoff because the app exercises and documents that service
contract.

## Mainline drift / merge note

The branch was correctly created from `main` at
`a6125f2b065ae8ed45286711828b70edba332f23`. While this run was in progress,
`main` advanced to `eb0ab384a753ead77c8f8d64a74b951efad6944d` in the observed compare.
Those newer commits add the Projects/Commerce PWA shell and associated shared
service-worker work. The base-to-current-main comparison did **not** show
changes to the Phase 1 feature files listed in this report; Projects overlap was
limited to shell/config/package/public PWA paths such as `apps/projects/next.config.ts`,
`apps/projects/package.json`, `apps/projects/src/app/layout.tsx`, and new public
PWA assets.

The orchestrator should still rebase or merge current `main` before the local
verification pass so the final PR contains both lines of work.

## Deferred by design

Not part of Phase 1:

- full Cycle API/UI;
- Phase product-language migration from the durable `Milestone` contract;
- task-list/work-group hierarchy;
- dependency/relationship model;
- Gantt, baselines, critical path;
- project templates;
- 876 Storage attachment integration;
- 876 Work calendar/reminder/recurrence integration;
- time logs/timesheets;
- budgets and Billing/Invoice execution;
- workload/resource planning;
- advanced Reports;
- layouts/layout rules;
- workflow automation/Blueprint;
- custom modules.

These remain candidates for subsequent independently mergeable phases rather
than being folded into this foundation branch.
