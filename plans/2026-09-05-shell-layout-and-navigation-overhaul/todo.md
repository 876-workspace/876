# Shell Layout, Navigation & Permissions Overhaul — Closeout TODO

- **Run:** `2026-09-05-shell-layout-and-navigation-overhaul`
- **Branch:** `feat/shell-layout-navigation-overhaul`
- **Tracker type:** execution checklist for remaining work only
- **Status:** `CLOSEOUT_BLOCKED_ON_RUNTIME`
- **Updated:** 2026-09-05
- **Relationship to `plan.md`:** `plan.md` remains the design/history document. This file is the operational source of truth for what still has to be completed before the integration branch is ready to merge to `main`.

---

## Current branch state

Current GitHub state at the latest repository-side closeout audit:

- head before this tracker correction: `a7f08e6fa0f3b6a55a6bd7838ec9fbc917f844e8`
- **33 commits ahead of `main`** before this tracker correction
- **0 commits behind `main`**
- merge base: `1419aaee85264ed4c278d952af6e4687383df157`
- no GitHub Actions runs exist for this branch
- no commit-status entries are attached to the audited head

Absence of CI/status entries is **not** a green verification result. C4 remains open until the command matrix is actually run.

### Closeout commits

- `c09f52f0` — add this dedicated closeout TODO
- `0ed9cb34` — complete the shared Markdown/comment editor treatment and focused regression coverage
- `ee7bebe7` — record C1 completion in this tracker
- `242702ef` — remove obsolete `ProjectDetail.projectsHref` compatibility residue
- `4de19178` — reconcile shell-spacing and Projects phase reports
- `fda5477a` — mark repository-side closeout work complete and runtime work open
- `76bac55e` — add the orchestrator closeout-progress report
- `8ee9961a` — align `plan.md` with the actual closeout/runtime-blocked state
- `a7f08e6f` — finalize the repository-side branch/readiness audit

### Original phase state

- [x] Phase 1 — shared product-UI Tailwind source coverage
- [x] Phase 2 — shared shell spacing contract
- [x] Phase 3 — semantic sidebar icons + collapsible Projects sidebar
- [x] Phase 4 — Projects record pages + comment/Markdown editor implementation
- [x] Phase 5 — Console record-page alignment
- [x] Phase 6 — Console `/workspace` hub
- [x] Phase 7 — nested permission grouping
- [x] Phase 8 — durable assignment-role mapping + dry-run backfill script

---

# Closeout phases

## C1 — Finish Phase 4 editor work — COMPLETE IN CODE

**Landed:** `0ed9cb34`

### Shared Markdown editor

- [x] Deliberate token-based light/dark surface
- [x] Distinct toolbar/body surfaces
- [x] Visible `focus-within` border/ring
- [x] Explicit Write/Preview active state via `aria-pressed` + `data-mode`
- [x] Semantic toolbar icons where the existing icon registry has a canonical match
- [x] Accessible names/tooltips preserved
- [x] Bold/italic/link keyboard shortcuts preserved
- [x] Responsive toolbar wrapping for narrow widths
- [x] Preview remains the same persisted Markdown renderer
- [x] Preview empty state retained/improved
- [x] Disabled state includes mode controls, formatting controls, and textarea
- [x] Public controlled-value/id/name/placeholder contract preserved

### Projects comments composition

- [x] New-comment composer has a labelled bordered/tinted surface
- [x] Comment action remains attached to the composer
- [x] Create error remains inline and preserves draft
- [x] Edit mode uses the same shared Markdown editor treatment
- [x] Update error remains inline and preserves edit mode/draft
- [x] Assignee/other unrelated controls remain out of scope

### Regression coverage added

- [x] `packages/ui/src/components/markdown-editor.contract.test.tsx` — 5 focused cases
- [x] `packages/projects-ui/src/issue-comments-editor.test.tsx` — 3 focused cases
- [x] Existing `markdown-editor.test.tsx` functional contract retained unchanged for final verification

### Acceptance still required

- [ ] C4 typecheck/test matrix
- [ ] C5 light/dark browser checks

---

## C2 — Compatibility cleanup + documentation reconciliation — COMPLETE IN CODE/DOCS

**Landed:** `242702ef`, `4de19178`, `8ee9961a`

### Compatibility residue

- [x] Remove `projectsHref` from the final Console `ProjectDetail` call
- [x] Remove deprecated `projectsHref?: string` from `ProjectDetailProps`
- [x] Confirm the Projects detail route already stopped passing the prop
- [x] Preserve unrelated list-level `projectsHref` contracts

### Shell-spacing report

- [x] Replace stale `var(--spacing-4/6/8)` documentation with real Tailwind v4 expressions:

```css
--876-shell-gutter: calc(var(--spacing) * 4);
--876-shell-gutter: calc(var(--spacing) * 6);
--876-shell-gutter: calc(var(--spacing) * 8);
```

- [x] Preserve the historical explanation of how the invalid form was found and fixed
- [x] Record that final browser acceptance remains in C5

### Projects report

- [x] Add editor closeout files
- [x] Add the 8 focused editor/comment regression cases
- [x] Remove the old “editor remains a handoff” statement
- [x] Record the deliberate Markdown-vs-Editor.js decision
- [x] Record `projectsHref` compatibility cleanup
- [x] Keep prior phase verification separate from final C4 verification

### Plan/tracker consistency

- [x] `plan.md` now marks Phase 4 `COMPLETE IN CODE`
- [x] `plan.md` status is `CLOSEOUT_BLOCKED_ON_RUNTIME`
- [x] `todo.md` remains the operational checklist
- [x] Historical diagnosis/evidence remains preserved in `plan.md`
- [ ] Mark both plan and TODO `COMPLETED` only after C3-C5 genuinely pass

---

## C3 — Repair existing production app-assignment data — BLOCKED ON PRODUCTION ACCESS

**Priority:** required before production acceptance

The durable code fix changes future/automatic role assignment. It does not retroactively repair the existing Efesto assignment.

Affected assignment from the production diagnosis:

- organization: `org_fa2cfb0bce834ae6a6537830159e5f14`
- app assignment: `asg_90275575846147508476c7e2b16c4335`
- diagnosed role: default `staff`
- expected mapped role: `super-admin`
- missing write permission at diagnosis: `comments.create`

### C3.1 Dry-run first

```bash
pnpm --filter @876/api app-access:backfill-roles
```

- [ ] Confirm execution environment intentionally points at production
- [ ] Capture JSON summary
- [ ] Confirm `dryRun: true`
- [ ] Review every candidate
- [ ] Confirm ordinary staff/member subjects are not widened
- [ ] Confirm revoked/deleted assignments are excluded
- [ ] Confirm the Efesto Projects assignment appears if still stale

### C3.2 Apply only after candidate review

Preferred order:

1. If every candidate is expected, run the reviewed global backfill with `--apply`.
2. If any candidate is surprising, do not apply globally; repair only the Efesto assignment through Console/operator API and investigate unexpected candidates separately.

```bash
pnpm --filter @876/api app-access:backfill-roles --apply
```

- [ ] Record repair method used
- [ ] Record Efesto old/new role IDs without storing credentials

### C3.3 Verify effective permissions

- [ ] Re-read Efesto app membership
- [ ] Confirm role is `super-admin`
- [ ] Confirm effective permissions include `comments.create`
- [ ] Confirm expected project/issue write permissions are present
- [ ] Confirm no explicit deny removes `comments.create`
- [ ] Confirm assignment remains active/not revoked/not deleted

### C3.4 Real production smoke test

- [ ] Create a non-sensitive test comment on a real Efesto issue
- [ ] Confirm no `Forbidden.` response
- [ ] Edit the comment
- [ ] Delete the comment
- [ ] Verify a normal staff/default-role subject still cannot perform writes it lacks permission for

**Current block:** this execution context has no production DB credentials/internal API key and no authenticated 876 Projects session. Do not mark C3 complete from code inspection alone.

---

## C4 — Full integration verification matrix — BLOCKED ON EXECUTION ENVIRONMENT

There are **no GitHub Actions runs** for this branch, and the audited head has no commit-status entries. The container available to this session does not contain `/root/projects/876`, does not have `pnpm` installed, and cannot resolve `github.com`, so it cannot obtain a checkout and run the commands locally. Final verification remains open rather than being inferred from phase reports.

### Static command audit completed

- [x] Verified the Projects application workspace name from `apps/projects/package.json` is `@876/projects-app`.
- [x] Corrected the prior erroneous `@876/projects` app-verification filter below. `@876/projects` is a dependency/package and must not substitute for application verification.
- [x] Verified exact app build workspace names for Console, CRM, Billing, Invoice, and Projects.

### Required checks

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test

pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test

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

### Boundary baseline

- [ ] Run `pnpm --filter @876/api boundaries`
- [ ] Confirm only the known 18 pre-existing `no-circular` violations remain
- [ ] Confirm no nineteenth violation was introduced

### Checkout/quality checks

- [ ] `git status --short` clean after intended commits
- [ ] No incidental local lockfile churn
- [ ] Run `grep -rn "eslint-disable\|as any" <closeout paths>` from a checkout and review matches
- [ ] Run formatter/linter required by git rules on changed closeout code before final merge acceptance

### Production builds still owed

```bash
pnpm --filter @876/console build
pnpm --filter @876/crm-app build
pnpm --filter @876/billing-app build
pnpm --filter @876/invoice-app build
pnpm --filter @876/projects-app build
```

- [ ] Console production build
- [ ] CRM production build
- [ ] Billing production build
- [ ] Invoice production build
- [ ] Projects production build after editor closeout

---

## C5 — Browser + production acceptance — BLOCKED ON AUTHENTICATED BROWSER/RUNTIME

### Viewport/theme matrix

For each required surface:

- [ ] 1280px light
- [ ] 1280px dark
- [ ] 1440px light
- [ ] 1440px dark
- [ ] 1920px light
- [ ] 1920px dark

### Required surfaces

- [ ] Console `/settings/users/.../permissions`
- [ ] Console `/requests`
- [ ] Console `/settings/users`
- [ ] Console project detail
- [ ] Console issue detail
- [ ] Console org-workspace project detail
- [ ] Console org-workspace issue detail
- [ ] Console `/workspace`
- [ ] Console role permission editor/detail
- [ ] Projects sidebar collapsed + expanded persistence
- [ ] Projects project detail
- [ ] Projects issue detail
- [ ] Projects comment create/edit composer

### Acceptance rules

- [ ] Sidebar/window/content insets read as one shared gutter rhythm
- [ ] No list pane visually touches the sidebar
- [ ] No duplicate navigation icons within a rail
- [ ] Projects rail defaults collapsed and persists expansion state
- [ ] Project/issue records own the page rather than opening in a legacy split detail column
- [ ] Project summary is not stacked because of missing Tailwind utilities
- [ ] Workspace header renders organization name once
- [ ] `/workspace` behaves as a hub
- [ ] Permissions read product → module → permission with useful rollups
- [ ] Markdown editor has clear light/dark surfaces, focus state, active mode, readable toolbar, and responsive wrapping
- [ ] Create/edit comment errors remain in-page and preserve drafts
- [ ] Repaired Efesto super-admin can create/edit/delete comments
- [ ] Staff/default role remains fail-closed for writes it lacks

---

## C6 — Final issue cleanup, closeout report, and PR — REPOSITORY AUDIT PARTIAL

### C6.1 PROJ-10 — EXTERNAL TRACKER BLOCK

The repository's GitHub Issues search returned no `PROJ-10`, so it appears to live in another tracker rather than GitHub Issues. A Linear integration is available and has been surfaced for connection; once connected, search `PROJ-10` there before attempting any rewrite/close action.

- [ ] Locate the actual tracker containing PROJ-10
- [ ] Close it if it only claims `comments.create` is missing from the catalog
- [ ] Or rewrite it around the real org-role → app-role assignment defect/backfill requirement
- [x] Do not create a duplicate GitHub issue just because the key is absent here
- [x] Surface the Linear integration as the most likely next issue-tracker lookup path

### C6.2 Branch/readiness audit

- [x] Branch currently 0 commits behind `main`
- [x] Latest pre-correction branch comparison reviewed: 33 commits ahead / 0 behind
- [x] Current changed-file list contains no environment file
- [x] Current changed-file list contains no delegated `*-run.log` transcript
- [x] Branch commit listing searched for `Co-Authored-By`: no matches
- [x] Branch commit listing searched for `Generated with`: no matches
- [x] Branch commit listing searched for `Claude`: no matches
- [x] Older descriptive `Codex` mentions were reviewed and are documentation about delegated CLI transcript handling, not contributor attribution
- [x] Audited head has no commit-status entries; this is recorded as “not verified,” not “green”
- [ ] Re-check `main` divergence immediately before final PR because `main` may advance
- [ ] Run final checkout-based diff quality/security scan after C3-C5 runtime work

### C6.3 Closeout reporting

- [x] Add repository-side closeout progress report: `reports/orchestrator/2026-09-05-closeout-progress.md`
- [x] Align `plan.md` with Phase 4 complete-in-code and runtime-blocked closeout state
- [x] Correct runtime verification commands to target the actual Projects app workspace
- [ ] Update the orchestrator report with actual C3-C5 results after runtime acceptance
- [ ] Mark `plan.md` `COMPLETED ✅` only after C3-C5 pass
- [ ] Mark this TODO `COMPLETED` only after C3-C5 pass

### C6.4 Final integration PR

Do **not** open the final PR yet. C3-C5 are acceptance gates and remain unverified.

When they pass:

- [ ] Open one PR: `feat/shell-layout-navigation-overhaul` → `main`
- [ ] Describe the entire overhaul, not only the editor closeout
- [ ] Lead with the two platform defects found: Tailwind shared-UI source coverage and app-role assignment ignoring org role
- [ ] Include shell/navigation/full-page record/workspace/permissions/editor outcomes
- [ ] Include exact final verification results and the 18-cycle baseline
- [ ] Immediately check mergeability/conflicts
- [ ] Inspect CI/status checks
- [ ] Resolve all actionable automated-review findings before merge

---

## Compact live checklist

### Repository-side work completed

- [x] C1 shared Markdown editor redesign
- [x] C1 Projects create/edit composer integration
- [x] C1 focused regression coverage
- [x] C2 remove `ProjectDetail.projectsHref` residue
- [x] C2 correct stale shell-spacing report
- [x] C2 update Projects report
- [x] C2 align `plan.md` with completed Phase 4 code
- [x] C4 static workspace/filter audit and command correction
- [x] C6 repository-side closeout progress report
- [x] C6 current branch divergence audit
- [x] C6 commit attribution audit
- [x] C6 changed-file env/run-log hygiene audit
- [x] C6 surface Linear integration for PROJ-10 lookup

### Runtime/external work still open

- [ ] C3 production backfill dry-run
- [ ] C3 production assignment repair
- [ ] C3 effective-permission re-read
- [ ] C3 production comment smoke test
- [ ] C4 full integration command matrix
- [ ] C4 formatter/lint/checkout quality gate
- [ ] C4 production-build coverage
- [ ] C5 light/dark browser acceptance
- [ ] C5 production permission acceptance
- [ ] C6 resolve PROJ-10 in its actual tracker
- [ ] C6 final checkout-based security/readiness audit after runtime checks
- [ ] C6 final acceptance report update
- [ ] C6 mark `plan.md` and this TODO complete
- [ ] C6 final PR to `main`
