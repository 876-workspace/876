# Shell Layout, Navigation & Permissions Overhaul — Closeout TODO

- **Run:** `2026-09-05-shell-layout-and-navigation-overhaul`
- **Branch:** `feat/shell-layout-navigation-overhaul`
- **Tracker type:** execution checklist for the remaining work only
- **Status:** `CLOSEOUT_IN_PROGRESS`
- **Updated:** 2026-09-05
- **Relationship to `plan.md`:** `plan.md` remains the design/history document. This file is the operational source of truth for what still has to be completed before the integration branch is ready to merge to `main`.

---

## 0. Current baseline

The integration branch is no longer in the earlier working-tree/delegation state. The previously uncommitted shell, navigation, Projects, Console, permissions, and assignment-role work has been committed and pushed.

At the time this closeout TODO was written, the branch is:

- **24 commits ahead of `main`**
- **0 commits behind `main`**
- Phase 1 complete
- Phase 2 complete in code
- Phase 3 complete
- Phase 4 partial: record pages complete, comment/Markdown editor redesign still missing
- Phase 5 complete in code
- Phase 6 complete
- Phase 7 complete
- Phase 8 durable code fix complete, including a dry-run-by-default backfill script
- Existing production Efesto assignment still requires a deliberate data repair
- PROJ-10 still needs to be closed or rewritten
- Final integration verification, browser acceptance, documentation reconciliation, and the final PR are still outstanding

### Landed implementation commits relevant to closeout

- `f005294d` — align product sidebar insets with the shared shell gutter
- `1d94b272` — assign distinct navigation icons and add collapsible Projects sidebar
- `3592b334` — present Projects project/issue records as full pages
- `09f5320c` — render Console project/issue records as full pages
- `7edb1131` — provide the Console `/workspace` hub and resolve organization navigation
- `27e795e3` — group role permissions by product and module
- `a99b5672` — record phase reports and briefs
- `4b24640f` — update the main plan tracker to the landed state

The durable app-assignment role mapping and dry-run backfill landed in earlier commits on the same branch.

---

# Closeout phases

The remaining work is intentionally split into six closeout phases. Execute them in order unless a task is explicitly marked parallel-safe.

## Dependency graph

```text
C1 Editor completion
  ├──> C2 Code/docs reconciliation
  └──> C4 Integration verification

C3 Production role repair
  └──> C5 Browser + production acceptance

C2 + C3 + C4 + C5
  └──> C6 Issue cleanup + final PR
```

Do **not** open the final PR to `main` before C1–C5 are complete.

---

## C1 — Finish Phase 4: comment / Markdown editor redesign

**Priority:** BLOCKING  
**Type:** code + tests  
**Goal:** complete the only missing implementation item from the original Phase 4.

### Why this remains open

The Projects record-page report explicitly states that no Markdown-editor implementation or editor-specific regression cases were added during the Projects record-page phase. The current issue comment surface uses the shared `@876/ui/markdown-editor`, so this should be fixed at the shared component level rather than by styling a one-off Projects-only editor.

### Current path

The composition is:

```text
apps/projects/src/features/projects/components/issue-comments-data.tsx
  -> @876/projects-ui/issue-comments
      -> @876/ui/markdown-editor
      -> @876/ui/markdown
```

Related editor infrastructure also exists in:

```text
packages/editor/src/react/editor.tsx
packages/editor/src/react/content.tsx
packages/editor/src/react/theme.ts
```

`@876/editor` is Editor.js-based and is not automatically the correct replacement for the lightweight comment composer. Inspect it for reusable theme/surface decisions before introducing anything new, but do not replace the Markdown comment contract with Editor.js unless there is a concrete product reason to change stored comment format.

### Files to inspect first

- `packages/ui/src/components/markdown-editor.tsx`
- `packages/ui/src/components/markdown-editor.test.tsx`
- `packages/ui/src/components/markdown.tsx`
- `packages/ui/src/components/textarea.tsx`
- `packages/projects-ui/src/issue-comments.tsx`
- the corresponding `packages/projects-ui` comment tests
- `packages/editor/src/react/editor.tsx`
- `packages/editor/src/react/theme.ts`

### Required editor changes

- [ ] Give the outer editor a deliberate surface in both light and dark themes instead of relying on a border around a mostly transparent textarea.
- [ ] Give the toolbar a clearly separate surface from the editable body without producing grey-on-grey contrast in dark mode.
- [ ] Add a visible `focus-within` state on the editor container so keyboard focus is obvious even though the textarea itself currently suppresses its ring.
- [ ] Keep Write / Preview as the primary editor modes and make the active mode visually unambiguous.
- [ ] Replace the current two-letter toolbar labels (`Bo`, `It`, etc.) with recognizable semantic icons from the existing `@876/ui/icons` registry where available.
- [ ] Preserve accessible names/tooltips for every formatting action.
- [ ] Keep keyboard shortcuts for bold, italic, and link.
- [ ] Ensure toolbar buttons wrap or degrade cleanly at narrower widths instead of crowding the Write / Preview controls.
- [ ] Ensure the editor body has sufficient minimum height for a comment but does not dominate the issue page.
- [ ] Keep resize behavior deliberate; if vertical resize remains enabled, verify it does not break the record layout.
- [ ] Style Preview as a first-class reading surface using the same Markdown renderer used for persisted comments.
- [ ] Add a useful Preview empty state.
- [ ] Preserve `disabled` behavior while comment create/update requests are pending.
- [ ] Ensure disabled styling remains legible in both themes.
- [ ] Keep `id`, `name`, placeholder, controlled-value behavior, and current public API compatibility unless a change is required.

### Issue-comment composition changes

The shared Markdown editor should carry most of the visual work, but the comment section still needs a coherent composition around it.

- [ ] Review `packages/projects-ui/src/issue-comments.tsx` after the shared editor redesign.
- [ ] Give the new-comment composer enough visual separation from the existing comment list.
- [ ] Confirm the create button reads as the composer action, not as a detached page-level action.
- [ ] Confirm validation/pending/error states do not shift the editor awkwardly.
- [ ] Keep `AppError` inline when create/update/delete fails; do not reintroduce page-breaking error behavior.
- [ ] Verify comment-edit mode uses the same editor treatment as comment-create mode.
- [ ] Verify comment cards and rendered Markdown remain readable next to the redesigned editor in both themes.
- [ ] Do not add assignee or other unrelated issue controls while touching this surface.

### Required tests

Existing functional Markdown-editor coverage is already substantial. Add regression coverage for the new contract rather than rewriting the existing tests.

- [ ] Editor root exposes a stable semantic/testable focus container or state.
- [ ] Write is the initial active mode.
- [ ] Preview becomes active and hides formatting actions.
- [ ] Toolbar retains accessible action names after switching from text abbreviations to icons.
- [ ] Disabled state disables formatting actions and textarea.
- [ ] Existing formatting insertion tests remain green.
- [ ] Existing shortcut tests remain green.
- [ ] Comment create composer renders the redesigned editor and submit action.
- [ ] Comment edit mode renders the same shared editor.
- [ ] Comment create error remains in-page and preserves the draft.
- [ ] Comment update error remains in-page and preserves edit mode/draft.

### Verification for C1

```bash
pnpm --filter @876/ui typecheck
pnpm --filter @876/ui test
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test
```

If `packages/editor/**` is modified, also run:

```bash
pnpm --filter @876/editor typecheck
pnpm --filter @876/editor test
```

### Acceptance criteria

C1 is complete only when:

- the comment composer is visually coherent in light and dark themes;
- Write/Preview and toolbar actions are usable with mouse and keyboard;
- create and edit modes share the same treatment;
- no comment data/storage contract changes were introduced accidentally;
- all relevant package tests/typechecks pass;
- the Phase 4 report is ready to be updated to say the editor work is actually complete.

---

## C2 — Reconcile compatibility cleanup and documentation

**Priority:** HIGH  
**Type:** small code cleanup + docs  
**Depends on:** C1 for final Phase 4 report wording  
**Parallel-safe with:** C3

This phase prevents the final PR from carrying known stale compatibility code and reports that contradict the implementation.

### C2.1 Remove the dead `projectsHref` compatibility shim

Current state:

- `packages/projects-ui/src/project-detail.tsx` still declares `projectsHref?: string` as deprecated.
- `ProjectDetail` no longer reads it.
- `apps/console/src/features/projects/components/project-detail-data.tsx` still passes `projectsHref={`${base}/projects`}`.

Tasks:

- [ ] Remove `projectsHref` from the Console `ProjectDetail` call.
- [ ] Remove the deprecated `projectsHref` prop from `ProjectDetailProps`.
- [ ] Search all hosts for any remaining `projectsHref` passed to `ProjectDetail`.
- [ ] Do **not** remove unrelated list-level `projectsHref` props used by project-list components.
- [ ] Update affected tests/types if necessary.

Verification:

```bash
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test
pnpm --filter @876/console typecheck
```

### C2.2 Correct the stale shell-spacing report

The actual token is now correct Tailwind v4 syntax:

```css
--876-shell-gutter: calc(var(--spacing) * 4);
--876-shell-gutter: calc(var(--spacing) * 6);
--876-shell-gutter: calc(var(--spacing) * 8);
```

The opening table in:

`plans/2026-09-05-shell-layout-and-navigation-overhaul/reports/codex/2026-09-05-shell-spacing-contract.md`

still describes the old invalid `var(--spacing-4/6/8)` form.

- [ ] Update the report table to match the code.
- [ ] Preserve the historical explanation that the invalid token form was found and corrected.
- [ ] Ensure the report does not imply the bad token still exists on the current branch.

### C2.3 Update the Projects report after C1

- [ ] Update `reports/codex/2026-09-05-projects-record-pages.md` with the editor files actually changed.
- [ ] Add the editor/comment tests actually added.
- [ ] Replace the current “remaining handoff” statement with completed verification evidence.
- [ ] Preserve the record-page design decisions and the explicit assignee-picker deferral.

### C2.4 Keep the plan and TODO roles separate

- [ ] `plan.md` remains the design/history document.
- [ ] `todo.md` remains the operational remaining-work checklist.
- [ ] When C1–C6 complete, set the plan status to `COMPLETE` and mark the final remaining plan checklist items done.
- [ ] Do not delete historical diagnosis, evidence, or handoff sections merely because the work has landed.

### Acceptance criteria

- no known dead compatibility prop remains;
- shell-spacing documentation matches actual CSS;
- Phase 4 documentation no longer says the editor is missing once C1 lands;
- `plan.md`, reports, and `todo.md` no longer contradict one another about current state.

---

## C3 — Repair and verify existing production app-assignment data

**Priority:** BLOCKING FOR PRODUCTION ACCEPTANCE  
**Type:** controlled production data operation  
**Parallel-safe with:** C1/C2  
**Important:** the backfill is dry-run by default. Never jump directly to `--apply`.

### Background

The durable code defect is fixed: automatic app assignment now derives app role from the target member's organization role. That does **not** retroactively change existing assignments.

The affected Efesto 876 Projects assignment was diagnosed as:

- app assignment: `asg_90275575846147508476c7e2b16c4335`
- organization: `org_fa2cfb0bce834ae6a6537830159e5f14`
- current app role at diagnosis: default `staff`
- expected app role for the organization `super_admin`: `super-admin`
- missing effective permission at diagnosis: `comments.create`

### C3.1 Dry-run the backfill

```bash
pnpm --filter @876/api app-access:backfill-roles
```

- [ ] Run against the intended production database/environment only after confirming environment variables point at production.
- [ ] Capture the JSON summary.
- [ ] Confirm `dryRun: true`.
- [ ] Review every candidate, not only the Efesto row.
- [ ] Confirm each proposed `oldRoleId -> newRoleId` matches the member's actual organization role.
- [ ] Confirm no ordinary `member`/`staff` subject is being widened to `admin`/`super-admin`.
- [ ] Confirm revoked/deleted assignments are not candidates.
- [ ] Confirm the Efesto Projects assignment appears if it still needs repair.

### C3.2 Choose the safest repair method

Preferred order:

1. If the dry-run contains only expected safe candidates, use the reviewed backfill with `--apply`.
2. If the dry-run contains unexpected candidates, do **not** apply globally; repair the single Efesto assignment through Console/operator API instead and investigate the unexpected candidates separately.

### C3.3 Apply only after review

Global reviewed backfill:

```bash
pnpm --filter @876/api app-access:backfill-roles --apply
```

Or use the targeted operator path documented in `plan.md` for only the Efesto assignment.

- [ ] Record which method was used.
- [ ] Record the before/after role IDs for the Efesto assignment.
- [ ] Do not store credentials/internal API keys in the report or commit history.

### C3.4 Verify effective permissions after repair

- [ ] Re-read the Efesto app membership.
- [ ] Confirm app role is `super-admin`.
- [ ] Confirm effective permissions include at least:
  - `comments.create`
  - project/issue write permissions expected for the app `super-admin` role
- [ ] Confirm no explicit deny unexpectedly removes `comments.create`.
- [ ] Confirm revoked/deleted timestamps remain unset for the active assignment.

### C3.5 Production comment smoke test

- [ ] Open a real Efesto issue in 876 Projects as the affected user.
- [ ] Add a short non-sensitive test comment.
- [ ] Confirm the request succeeds and the comment appears without reload if optimistic/local state is expected.
- [ ] Edit the test comment.
- [ ] Delete the test comment.
- [ ] Confirm there is no `Forbidden.` banner.
- [ ] Confirm an ordinary staff member still cannot perform a write they do not hold permission for.

### Acceptance criteria

C3 is complete only when the existing affected production assignment is repaired and the real comment create path succeeds with the expected permission boundary intact.

---

## C4 — Run the complete integration verification matrix

**Priority:** BLOCKING  
**Type:** automated verification  
**Depends on:** C1 and any C2 code cleanup

Phase-specific green checks do not prove the final 24+ commit integration result is green. Run the matrix from the integration branch after all code changes are complete.

### C4.1 Working-tree hygiene before verification

```bash
git status --short
```

- [ ] Confirm only intentional closeout changes are present.
- [ ] No generated run logs.
- [ ] No environment files/secrets.
- [ ] No incidental lockfile churn.
- [ ] Search touched code for prohibited escapes:

```bash
grep -rn "eslint-disable\|as any" <closeout paths>
```

- [ ] Review any match rather than automatically assuming it is invalid.

### C4.2 Core package/app checks

Run in the foreground:

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test

pnpm --filter @876/projects typecheck
pnpm --filter @876/projects lint
pnpm --filter @876/projects test

pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test

pnpm --filter @876/ui typecheck
pnpm --filter @876/ui test

pnpm --filter @876/api typecheck
pnpm --filter @876/api lint
pnpm --filter @876/api test

pnpm --filter @876/core typecheck
pnpm --filter @876/core test

pnpm --filter @876/editor typecheck
pnpm --filter @876/editor test

node scripts/check-app-structure.mjs
pnpm check:transpile
```

### C4.3 Boundary baseline

```bash
pnpm --filter @876/api boundaries
```

Known baseline from this run: **18 existing `no-circular` violations** also existed on the base. The closeout requirement is:

- [ ] still 18, or fewer because of unrelated legitimate cleanup;
- [ ] never 19+ because this branch added another cycle.

Do not expand this feature into fixing all historical cycles.

### C4.4 Production-build checks owed from the Tailwind source phase

The Phase 1 handoff explicitly left some host production builds unverified. Once the shared UI/editor work is stable, run the relevant host builds required by repository policy and the original source-glob acceptance, including at minimum:

- [ ] Projects
- [ ] Console
- [ ] CRM
- [ ] Billing
- [ ] Invoice

Use the repo's actual package scripts. Do not alter dependencies merely to make a sandbox-specific build pass without diagnosing the reason.

### C4.5 Failure handling

For every failure:

- [ ] determine whether it is branch-introduced or a verified base failure;
- [ ] fix branch-introduced failures before proceeding;
- [ ] record unchanged base failures with evidence rather than silently ignoring them;
- [ ] rerun the smallest relevant suite after a fix, then rerun the final matrix when closeout fixes stop changing code.

### Acceptance criteria

- all branch-owned typecheck/lint/test/structure/source checks are green;
- no new API boundary violation;
- required production builds prove shared product-UI classes are compiled by their hosts;
- the final verification result is documented with actual counts/results, not “seems green”.

---

## C5 — Browser visual and behavior acceptance

**Priority:** BLOCKING  
**Type:** manual/browser verification  
**Depends on:** C1, C3, C4

The original problem is visual/systemic, so unit tests alone cannot close the run.

### Required viewport/theme matrix

For every primary surface below:

- [ ] 1280px desktop — light
- [ ] 1280px desktop — dark
- [ ] 1440px desktop — light
- [ ] 1440px desktop — dark
- [ ] 1920px desktop — light
- [ ] 1920px desktop — dark

A representative mobile/tablet smoke pass is also recommended for changed navigation/editor surfaces, but the original acceptance widths above are mandatory.

### C5.1 Shared shell rhythm

Check representative apps/routes:

- Console `/settings/users`
- Console `/settings/users/<user>/permissions`
- Console `/requests`
- Projects project and issue routes
- one floating-sidebar host such as Billing/Couriers

Verify:

- [ ] window edge -> sidebar card inset is intentional and symmetric for floating sidebars;
- [ ] sidebar -> list/content gap uses the common shell rhythm;
- [ ] list -> detail gap matches the shell rhythm where a split view still exists;
- [ ] detail -> right edge does not look tighter than the other gutters;
- [ ] expanded/collapsed rail transitions do not produce jumps or compounded padding;
- [ ] navigation rows align consistently in rail, expanded panel, and contextual/drill-down states.

### C5.2 Navigation icons and Projects sidebar

- [ ] Projects, Issues, Board, and Labels are visually distinct.
- [ ] Console Audit is distinct from Issues.
- [ ] customer/team/subscriber/user concepts are distinguishable.
- [ ] organization/banking/warehouse concepts are distinguishable.
- [ ] Projects sidebar defaults to collapsed icon rail for a new preference state.
- [ ] toggle expands to labels.
- [ ] preference persists after navigation/reload.
- [ ] tooltips/labels make icon-only navigation understandable.

### C5.3 Projects record pages

Project detail:

- [ ] exactly one back/breadcrumb affordance;
- [ ] record header hierarchy is clear;
- [ ] status/health badges are legible in both themes;
- [ ] Project lead / Target date / Members render as the intended three-up facts row at supported width;
- [ ] issues section reads as a separate data surface.

Issue detail:

- [ ] identifier/title/status/priority hierarchy is clear;
- [ ] description has a readable measure;
- [ ] facts sidebar aligns with the record body;
- [ ] empty assignee/due-date/estimate states look intentional;
- [ ] activity timeline is readable and not visually fused into the facts area.

Comments/editor:

- [ ] new editor has distinct toolbar/body/preview surfaces in light mode;
- [ ] same in dark mode without grey-on-grey collapse;
- [ ] focus state is visible;
- [ ] toolbar remains usable at narrower content widths;
- [ ] Write/Preview switching is obvious;
- [ ] Markdown preview matches rendered comments;
- [ ] create/edit/delete behavior works after the production role repair.

### C5.4 Console project/workspace alignment

- [ ] platform project list is a normal list page, not a permanent split-detail frame;
- [ ] project record opens as its own page;
- [ ] issue record opens as its own page;
- [ ] organization workspace project/issue routes use the same shared record components;
- [ ] workspace header shows the organization name only once;
- [ ] root sidebar context no longer redundantly prints `Console`.

### C5.5 `/workspace` hub

- [ ] `/workspace` no longer 404s;
- [ ] organization/workspace cards render as a hub, not a data table;
- [ ] only organizations/workspaces the operator is allowed to access appear;
- [ ] navigation into an organization workspace is correct;
- [ ] empty state is useful if no entitled workspace exists.

### C5.6 Permission surfaces

Read-only user access panel:

- [ ] top level is product;
- [ ] modules are nested under the product;
- [ ] product row shows granted/total roll-up;
- [ ] module card treatment remains recognizable.

Role editor / role detail:

- [ ] same product -> module hierarchy as the read-only panel;
- [ ] permission selection remains usable when a product contains many modules;
- [ ] Console-only operator actions remain visibly separate from product permission groups;
- [ ] no regression to a flat list of `876 Billing · Catalog`, `876 Billing · Sales`, etc.

### Acceptance criteria

C5 is complete when the user-facing system visually satisfies the original shell/navigation/records/permissions requirements in both themes and the production comment workflow succeeds.

---

## C6 — Issue cleanup, final documentation, and integration PR

**Priority:** FINAL GATE  
**Type:** tracker/docs/PR  
**Depends on:** C1–C5

### C6.1 Resolve PROJ-10

The diagnosed premise “comments are not wired into the app permission catalog” is false: `comments.create` is already catalogued and granted by the appropriate app roles. The defect was automatic assignment of the default read-only app role regardless of organization role.

- [ ] Locate PROJ-10 in the project tracker.
- [ ] Choose one:
  - close it as superseded/not applicable and link the assignment-role fix; or
  - rewrite it to describe automatic organization-role -> app-role mapping/backfill behavior.
- [ ] Do not leave the old title/body implying the permission catalog is missing comment permissions.
- [ ] Record the resolution in the final closeout report.

### C6.2 Final documentation closeout

- [ ] Update `plan.md` status from `CLOSEOUT_IN_PROGRESS` to `COMPLETE` only after all gates are satisfied.
- [ ] Mark the production data repair complete only after actual production verification.
- [ ] Mark browser acceptance complete only after the required matrix was performed.
- [ ] Mark final integration verification complete with the actual command results.
- [ ] Update any stale phase report found during verification.
- [ ] Add a concise final closeout report under this run's `reports/` tree summarizing:
  - original defects;
  - implementation by phase;
  - production role repair performed;
  - verification commands/results;
  - known pre-existing failures/baselines;
  - deferred work that is explicitly out of scope.

### C6.3 Final branch audit

Before opening the PR:

```bash
git status
git log --oneline main..HEAD
git diff --check main...HEAD
```

- [ ] no uncommitted/untracked feature files;
- [ ] no run logs;
- [ ] no credentials/secrets;
- [ ] no accidental generated files;
- [ ] no AI attribution or `Co-Authored-By` trailers in closeout commits;
- [ ] commit messages remain focused and conventional;
- [ ] branch remains updated against `main`.

### C6.4 Open the single integration PR

Target:

```text
feat/shell-layout-navigation-overhaul -> main
```

The PR description should explain the **whole feature**, not only the editor closeout.

Required narrative:

- shared Tailwind product-UI source defect and CI/source guard;
- unified shell gutter contract;
- semantic navigation icons and Projects collapsible sidebar;
- Projects + Console full-page project/issue records;
- `/workspace` hub;
- nested product -> module -> permission UI;
- app-assignment organization-role -> app-role mapping;
- production data/backfill handling;
- final verification and visual acceptance.

- [ ] Open one final PR only.
- [ ] Immediately check mergeability/conflicts against `main`.
- [ ] If `main` moved, update the integration branch without discarding the phase history.
- [ ] Run/confirm configured CI checks on the PR head.
- [ ] Wait for configured automated code-review bots.
- [ ] Inspect top-level and inline review feedback.
- [ ] Fix every actionable finding and add regression coverage where appropriate.
- [ ] Rerun affected checks after review fixes.
- [ ] Do not merge while a configured review is pending or an actionable finding remains.

### Acceptance criteria

The run is complete only when:

- C1 editor implementation is complete;
- C2 docs/compatibility cleanup is complete;
- C3 production assignment is repaired and verified;
- C4 integration matrix passes with known baselines recorded;
- C5 visual/behavior matrix is accepted;
- PROJ-10 no longer states the false diagnosis;
- plan/report/todo state is coherent;
- final PR to `main` is open, conflict-checked, and ready for the repository's normal review gates.

---

# Compact execution checklist

Use this section as the day-to-day tracker. The detailed sections above define what each checkbox means.

## C1 — Editor

- [ ] Redesign shared `MarkdownEditor` surfaces for light/dark
- [ ] Add visible focus-within treatment
- [ ] Replace two-letter toolbar controls with semantic icons
- [ ] Keep accessible labels/tooltips and keyboard shortcuts
- [ ] Verify toolbar responsive wrapping
- [ ] Verify Write/Preview visual states
- [ ] Verify disabled/pending states
- [ ] Align Projects comment composer around the redesigned editor
- [ ] Align comment edit mode
- [ ] Add/update UI + Projects UI tests
- [ ] Run C1 package checks

## C2 — Cleanup/docs

- [ ] Remove dead `ProjectDetail.projectsHref` compatibility prop
- [ ] Remove Console caller's dead `projectsHref`
- [ ] Correct shell-spacing report token table
- [ ] Update Projects record/editor report after C1
- [ ] Reconcile plan/report/TODO wording

## C3 — Production data

- [ ] Run role backfill in dry-run mode
- [ ] Review every candidate
- [ ] Repair Efesto assignment with reviewed method
- [ ] Re-read role + effective permissions
- [ ] Confirm `comments.create`
- [ ] Production create/edit/delete comment smoke test
- [ ] Verify staff remains restricted

## C4 — Automated verification

- [ ] Working-tree/security hygiene review
- [ ] Console typecheck/lint/test
- [ ] Projects typecheck/lint/test
- [ ] Projects UI typecheck/test
- [ ] UI typecheck/test
- [ ] API typecheck/lint/test
- [ ] Core typecheck/test
- [ ] Editor typecheck/test
- [ ] app-structure check
- [ ] transpile/Tailwind-source check
- [ ] API boundaries: no new cycle
- [ ] Required production host builds
- [ ] Record exact final results

## C5 — Browser acceptance

- [ ] 1280 light/dark
- [ ] 1440 light/dark
- [ ] 1920 light/dark
- [ ] Shared gutter rhythm
- [ ] Navigation icon uniqueness/clarity
- [ ] Projects sidebar collapse/persistence
- [ ] Projects project page
- [ ] Projects issue page
- [ ] Comment editor + live comment workflow
- [ ] Console full-page records
- [ ] Workspace header
- [ ] `/workspace` hub
- [ ] Permission access panel
- [ ] Role editor/detail permission hierarchy

## C6 — Finalize

- [ ] Close/rewrite PROJ-10
- [ ] Final closeout report
- [ ] Mark `plan.md` complete
- [ ] Final branch/commit attribution audit
- [ ] Ensure branch is current with `main`
- [ ] Open one integration PR to `main`
- [ ] Check conflicts immediately
- [ ] Wait for CI and configured review bots
- [ ] Resolve actionable findings
- [ ] PR ready for merge

---

# Explicitly deferred / out of scope

Do not accidentally grow the closeout into adjacent product work.

- Assignee picker implementation
- CRM assignment integration
- General redesign of every Editor.js surface
- Fixing all historical API circular dependency violations
- Unrelated Console/Billing/CRM UI cleanup not required by the shell contract
- New permission catalog concepts unrelated to the assignment-role defect
- Broad production data rewrites beyond reviewed assignment-role candidates

If any of these are discovered to be required for correctness rather than polish, document the dependency before expanding scope.
