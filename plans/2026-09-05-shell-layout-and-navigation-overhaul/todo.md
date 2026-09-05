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

At the time this closeout TODO was written, the branch was 24 commits ahead of `main` and 0 behind. Closeout implementation has now started directly on the same integration branch.

Current phase state:

- Phase 1 complete
- Phase 2 complete in code
- Phase 3 complete
- Phase 4 implementation complete: record pages and the comment/Markdown editor redesign are now landed
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
- `c09f52f0` — add this dedicated closeout TODO
- `0ed9cb34` — complete the shared Markdown/comment editor treatment and focused regression coverage

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

## C1 — Finish Phase 4: comment / Markdown editor redesign — COMPLETE IN CODE

**Priority:** BLOCKING  
**Type:** code + tests  
**State:** implementation landed in `0ed9cb34`; runtime verification still rolls into C4/C5.

### Why this was open

The Projects record-page report explicitly stated that no Markdown-editor implementation or editor-specific regression cases were added during the Projects record-page phase. The issue comment surface uses the shared `@876/ui/markdown-editor`, so the fix belongs at the shared component level rather than as a Projects-only styling fork.

### Ownership decision

The composition remains:

```text
apps/projects/src/features/projects/components/issue-comments-data.tsx
  -> @876/projects-ui/issue-comments
      -> @876/ui/markdown-editor
      -> @876/ui/markdown
```

`@876/editor` remains Editor.js-based and was inspected as related infrastructure, but the lightweight Markdown comment storage/transport contract was intentionally not replaced with Editor.js.

### Implemented editor changes

- [x] Give the outer editor a deliberate light/dark surface.
- [x] Separate the toolbar surface from the editable body with token-based borders/backgrounds.
- [x] Add a visible `focus-within` border/ring contract on the editor container.
- [x] Keep Write / Preview as the primary modes and expose active state with `aria-pressed` and `data-mode`.
- [x] Replace two-letter toolbar labels with existing semantic icons where available; keep single-letter typographic marks for Bold/Italic/Strike where the icon registry has no canonical formatting glyph.
- [x] Preserve accessible names/tooltips for every formatting action.
- [x] Keep keyboard shortcuts for bold, italic, and link.
- [x] Make the toolbar stack/wrap cleanly at narrow widths.
- [x] Keep comment editor height deliberate (`minRows={4}` in comment create/edit; shared default remains compatible).
- [x] Preserve vertical resize behavior.
- [x] Style Preview as a first-class reading surface using the existing Markdown renderer.
- [x] Preserve and improve the Preview empty state.
- [x] Preserve disabled behavior and extend it to mode controls.
- [x] Keep `id`, `name`, placeholder, controlled-value behavior, and the existing public API.

### Implemented issue-comment composition changes

- [x] Review and update `packages/projects-ui/src/issue-comments.tsx` around the shared editor.
- [x] Give the new-comment composer a labelled bordered/tinted surface separate from the list.
- [x] Keep the Comment action visually attached to the composer.
- [x] Keep create errors inline inside the composer without clearing the draft.
- [x] Use the same editor treatment for edit mode.
- [x] Keep edit errors inline without dropping edit mode/draft.
- [x] Leave assignee and unrelated issue controls untouched.

### Added regression coverage

- [x] Stable labelled editor group and `data-slot`/`data-mode` contract.
- [x] Write is the initial active mode.
- [x] Preview becomes active and hides formatting actions.
- [x] Toolbar actions retain accessible names after icon conversion.
- [x] Shared focus-within treatment is asserted.
- [x] Disabled state covers mode controls, formatting actions, and textarea.
- [x] New-comment composer renders the shared Markdown editor and submit action.
- [x] Create errors preserve the draft and composer.
- [x] Comment edit mode renders the same shared editor.
- [x] Update errors preserve the edit draft/editor.

### C1 verification still required in C4

```bash
pnpm --filter @876/ui typecheck
pnpm --filter @876/ui test
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test
pnpm --filter @876/projects typecheck
pnpm --filter @876/projects test
```

No `packages/editor/**` files were modified, so its test/typecheck is not required specifically by C1; it remains in the final matrix for integration confidence.

---

## C2 — Reconcile compatibility cleanup and documentation — IN PROGRESS

**Priority:** HIGH  
**Type:** small code cleanup + docs  
**Depends on:** C1 complete  
**Parallel-safe with:** C3

This phase prevents the final PR from carrying known stale compatibility code and reports that contradict the implementation.

### C2.1 Remove the dead `projectsHref` compatibility shim

Current state before C2:

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
- [ ] Replace the current “remaining handoff” statement with completed implementation evidence.
- [ ] Preserve the record-page design decisions and the explicit assignee-picker deferral.

### C2.4 Keep the plan and TODO roles separate

- [x] `plan.md` remains the design/history document.
- [x] `todo.md` remains the operational remaining-work checklist.
- [ ] When C1–C6 complete, set the plan status to `COMPLETED` and mark the final remaining plan checklist items done.
- [x] Do not delete historical diagnosis, evidence, or handoff sections merely because the work has landed.

---

## C3 — Repair and verify existing production app-assignment data

**Priority:** BLOCKING FOR PRODUCTION ACCEPTANCE  
**Type:** controlled production data operation  
**Parallel-safe with:** C2  
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
- [ ] Confirm effective permissions include at least `comments.create` and expected project/issue write permissions.
- [ ] Confirm no explicit deny unexpectedly removes `comments.create`.
- [ ] Confirm revoked/deleted timestamps remain unset for the active assignment.

### C3.5 Production comment smoke test

- [ ] Open a real Efesto issue in 876 Projects as the affected user.
- [ ] Add a short non-sensitive test comment.
- [ ] Confirm the request succeeds and the comment appears.
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

Phase-specific green checks do not prove the final integration result is green. Run the matrix from the integration branch after all code changes are complete.

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

### C4.2 Core package/app checks

Run in the foreground/local execution environment:

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

### C4.3 Known baseline

- [ ] Run `pnpm --filter @876/api boundaries`.
- [ ] Confirm it still reports only the known 18 pre-existing `no-circular` violations and no nineteenth violation from this branch.

### C4.4 Production-build coverage still owed from Phase 1

- [ ] Build/production-verify Console.
- [ ] Build/production-verify CRM.
- [ ] Build/production-verify Billing.
- [ ] Build/production-verify Invoice.
- [ ] Re-run Projects production build if closeout editor changes affect its compiled CSS/component graph.

---

## C5 — Browser acceptance and production workflow verification

**Priority:** BLOCKING  
**Type:** browser/manual integration verification  
**Depends on:** C3 and C4

### Required viewport/theme matrix

For each named surface, verify at:

- [ ] 1280px light
- [ ] 1280px dark
- [ ] 1440px light
- [ ] 1440px dark
- [ ] 1920px light
- [ ] 1920px dark

### Surfaces

- [ ] Console `/settings/users/.../permissions`
- [ ] Console `/requests`
- [ ] Console `/settings/users`
- [ ] Console project detail
- [ ] Console issue detail
- [ ] Console org workspace project detail
- [ ] Console org workspace issue detail
- [ ] Console `/workspace`
- [ ] Console role permission editor/detail
- [ ] Projects sidebar collapsed + expanded persistence
- [ ] Projects project detail
- [ ] Projects issue detail
- [ ] Projects comment create/edit composer

### Visual acceptance rules

- [ ] Sidebar/window/content insets read as one shared gutter rhythm.
- [ ] No list pane visually touches the sidebar.
- [ ] No duplicate navigation icons within a rail.
- [ ] Projects rail defaults collapsed and persists expansion state.
- [ ] Project and issue detail own the page; no legacy split detail column remains.
- [ ] Project summary renders as intended rather than stacked due to missing Tailwind utilities.
- [ ] Workspace header renders the organization name once.
- [ ] `/workspace` behaves as a hub rather than 404ing or imitating a table view.
- [ ] Permissions read as product → module → permission with usable rollups.
- [ ] Markdown editor has clear light/dark surfaces, focus state, active mode, readable toolbar, and responsive wrapping.
- [ ] Create/edit comment errors stay in-page without destroying the record surface or draft.

### Production permission acceptance

- [ ] The repaired Efesto super-admin can create/edit/delete a comment.
- [ ] The write action no longer returns `Forbidden.` for the repaired assignment.
- [ ] A staff/default-role assignment remains unable to write without the matching permission.

---

## C6 — Issue cleanup, final documentation, and final integration PR

**Priority:** FINAL  
**Depends on:** C2, C3, C4, C5

### C6.1 Resolve PROJ-10

The original premise (“comment permissions are missing from the app catalog”) was disproven. The catalog and admin/super-admin roles already held `comments.create`; the defect was assignment-role mapping.

- [ ] Locate the actual tracker containing PROJ-10.
- [ ] If it only asks to add comment permissions to the catalog, close it as based on a false premise and link/reference the durable assignment-role fix.
- [ ] If the ticket should remain as historical work, rewrite it to describe automatic org-role → app-role mapping and the production backfill requirement.
- [ ] Do not create a duplicate GitHub issue merely because PROJ-10 is not present in this repository's GitHub Issues list.

### C6.2 Final reports and tracker closure

- [ ] Add/update a final orchestrator report containing the actual closeout commits and verification evidence.
- [ ] Update `plan.md` status to `COMPLETED ✅` only after C3–C5 are genuinely done.
- [ ] Mark every remaining top-level plan checklist item accurately.
- [ ] Mark this `todo.md` status complete.
- [ ] Preserve any externally blocked item as open rather than falsely certifying it.

### C6.3 Branch readiness

- [ ] Confirm branch is current with `main` before the final PR.
- [ ] Review the final `main...integration` diff for duplicate helpers, compatibility residue, swallowed errors, `as any`, `eslint-disable`, unrelated formatting churn, and accidental secrets.
- [ ] Confirm commits contain no `Co-Authored-By`, AI-generated attribution, or similar forbidden trailers.
- [ ] Confirm no generated logs or environment files are tracked.

### C6.4 Final PR

Only after C1–C5 are complete:

- [ ] Open the single final PR from `feat/shell-layout-navigation-overhaul` → `main`.
- [ ] Describe the feature as a whole, not only the final editor closeout.
- [ ] Lead with the two platform defects found: missing Tailwind source coverage and default app-role assignment ignoring org role.
- [ ] Include the shell/navigation/full-page records/workspace/permissions/editor outcomes.
- [ ] Include exact verification evidence and the known 18-cycle boundary baseline.
- [ ] Immediately verify mergeability/conflicts against `main`.
- [ ] Inspect CI/status checks on the PR head.
- [ ] Wait for configured automated reviewers and resolve every actionable finding before merge.

---

## Compact live checklist

### Implementable in-repo

- [x] C1 shared Markdown editor redesign
- [x] C1 Projects comment composer/edit composition
- [x] C1 focused editor/comment regression coverage
- [ ] C2 remove dead `ProjectDetail.projectsHref`
- [ ] C2 correct stale shell-spacing report
- [ ] C2 update Projects report with editor completion
- [ ] C4 final integration verification matrix
- [ ] C4 production-build coverage
- [ ] C6 final report/tracker closure
- [ ] C6 final PR readiness audit

### External/runtime acceptance

- [ ] C3 production backfill dry-run
- [ ] C3 production assignment repair
- [ ] C3 effective-permission re-read
- [ ] C3 production comment smoke test
- [ ] C5 light/dark viewport acceptance
- [ ] C5 production permission acceptance
- [ ] C6 resolve PROJ-10 in its actual tracker
- [ ] C6 final PR to `main`
