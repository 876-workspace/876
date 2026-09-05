# Shell Layout, Navigation & Permissions Overhaul — Closeout TODO

- **Run:** `2026-09-05-shell-layout-and-navigation-overhaul`
- **Branch:** `feat/shell-layout-navigation-overhaul`
- **Tracker type:** execution checklist for remaining work only
- **Status:** `CLOSEOUT_BLOCKED_ON_RUNTIME_AND_ACTIONS`
- **Updated:** 2026-09-05
- **Relationship to `plan.md`:** `plan.md` remains the design/history document. This file is the operational source of truth for what still has to be completed before the integration branch is ready to merge to `main`.

---

## Current branch / PR state

Latest audited GitHub state before this tracker update:

- head: `55a72c9e8ff215f53112dc94abf147c2d3a35a80`
- **39 commits ahead of `main`**
- **0 commits behind `main`**
- merge base: `1419aaee85264ed4c278d952af6e4687383df157`
- draft integration PR: **#478**
- PR mergeability: **mergeable**, but intentionally draft/not ready

The draft PR is the single integration PR and the CI harness for this closeout.
It must remain draft until C3-C5 are genuinely accepted.

### GitHub connector retry rule

A GitHub tool timeout, transient rate limit, or temporary connector failure is
not treated as exhaustion. The exact operation reference is retained and retried
after a short gap. This run-specific rule is saved at:

`notes/github-tool-retry.md`

The current Actions result below is **not** based on a single failed GitHub tool
call: the workflow/job reads were retried successfully across multiple branch
heads and returned the same stable result.

### GitHub Actions result on PR #478

The pull-request workflows have now been triggered repeatedly by later branch
commits. Across separate heads, the same jobs fail before any workflow step runs:

- UI tests — component-tests, widget-browser, and chromium-smoke have empty step lists and no logs
- App structure — `structure` has an empty step list and no logs
- API container image — fails before steps
- Billing API quality — `verify` has an empty step list and no logs
- Billing API container image — fails before steps
- Couriers API container image — fails before steps

The App structure job was explicitly retried/read again after a gap and still
returned `steps: []`; the job-log endpoint again had no log blob. A later branch
head triggered a fresh App structure run and produced the same no-step result.
This is therefore a reproducible Actions/runner-account execution block, **not a
GitHub connector timeout and not evidence of a repository test/compile failure**.
The exact account-side reason is not exposed by the available repository API.

Do not treat these red workflow conclusions as code failures. Real C4 acceptance
still requires a runner/local environment that can actually execute step 1.

### Closeout commits

- `c09f52f0` — add this dedicated closeout TODO
- `0ed9cb34` — complete the shared Markdown/comment editor treatment and focused regression coverage
- `ee7bebe7` — record C1 completion in this tracker
- `242702ef` — remove obsolete `ProjectDetail.projectsHref` compatibility residue
- `4de19178` — reconcile shell-spacing and Projects phase reports
- `fda5477a` — mark repository-side closeout work complete and runtime work open
- `76bac55e` — add the orchestrator closeout-progress report
- `8ee9961a` — align `plan.md` with the closeout/runtime-blocked state
- `a7f08e6f` — finalize the repository-side branch/readiness audit
- `6db88a11` — correct Projects app verification/build workspace filters
- `bea99ac8` — record static verification and execution-environment findings
- `5a4845b8` — record draft PR and Actions runner block
- `f9a8af2b` — save the GitHub connector retry rule and retry references
- `11b70128` — fully reactivate provisioned app assignments without overwriting app role
- `55a72c9e` — add focused assignment-reactivation regression coverage

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

### Static C1 audit

- [x] New icon imports resolve against `@876/ui/icons`
- [x] Used Button variants/sizes exist in the shared Button contract
- [x] No parallel Markdown composer implementation introduced
- [x] No `as any`, `eslint-disable`, or `@ts-ignore` in the C1 diff
- [x] Comment storage/transport contract unchanged

### Acceptance still required

- [ ] C4 typecheck/test matrix actually executes
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

- [x] `plan.md` marks Phase 4 `COMPLETE IN CODE`
- [x] `todo.md` remains the operational checklist
- [x] Historical diagnosis/evidence remains preserved in `plan.md`
- [ ] Reconcile `plan.md` with draft PR #478, the Actions block, corrected Projects app filter, and reactivation fix
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

A Neon integration capable of inspecting/managing the Postgres environment has
been surfaced because the repository documents Neon-backed database endpoints.
It may unblock C3 once connected to the account that owns the relevant production
database. No production mutation is inferred from merely connecting it.

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

**Current block:** this execution context has no connected production database/internal API credential and no authenticated 876 Projects browser session. Do not mark C3 complete from code inspection alone.

---

## C4 — Full integration verification matrix — BLOCKED ON ACTIONS + LOCAL EXECUTION

### C4.0 CI harness — COMPLETE, INFRASTRUCTURE BLOCK CONFIRMED

- [x] Open the single integration PR as draft: **#478**
- [x] Confirm PR is mergeable and remains draft
- [x] Trigger existing pull-request workflows
- [x] Inspect workflow/job results
- [x] Retry GitHub workflow/job reads after a gap instead of treating a transient tool failure as exhaustion
- [x] Trigger fresh workflow runs on later branch heads and reproduce the same pre-step failure
- [x] Confirm failing jobs expose empty step lists and no logs
- [x] Classify current GitHub Actions result as infrastructure-blocked, not code-failed
- [ ] Restore Actions runner/account availability outside this repository change
- [ ] Rerun C4 workflows after Actions can actually start jobs

The local container also cannot replace CI: no checkout exists, `pnpm` is not
installed, shell DNS cannot resolve GitHub/npm, and Corepack cannot download pnpm.

### C4.1 Static command/API audit — COMPLETE

- [x] Verify the Projects application workspace is `@876/projects-app`
- [x] Correct the prior erroneous `@876/projects` app-verification filter
- [x] Verify exact app build workspace names for Console, CRM, Billing, Invoice, and Projects
- [x] Verify new Markdown toolbar icon imports exist in `@876/ui/icons`
- [x] Verify used shared Button variants/sizes exist
- [x] Verify durable role mapper call sites use the target membership's organization role
- [x] Verify provisioning replay does not overwrite an existing app role

### C4.2 PR-wide diff quality/security audit — COMPLETE AT DIFF LEVEL

The full PR patch was searched directly rather than relying on a local grep.

- [x] `as any` matches are documentation/rule text only; no changed production/test code uses it
- [x] `eslint-disable` matches are documentation/rule text only
- [x] `@ts-ignore` matches are documentation/rule text only
- [x] `as unknown as` matches are documentation/rule text only
- [x] No `FIXME` marker exists in the branch diff
- [x] No `API_KEY=` secret assignment surfaced in the patch
- [x] No password assignment surfaced in the patch
- [x] No private-key block surfaced in the patch
- [x] `console.log` additions are limited to intentional CLI/check-script output
- [x] Changed-file inventory contains no environment file or delegated run transcript

### C4.3 Provisioning replay hardening — COMPLETE IN CODE

Static review found a real assignment lifecycle defect: provisioning replay set a
revoked row back to `status: 'active'` without clearing `revokedAt`, `deletedAt`,
or the related actor/reason fields. Effective permission resolution requires
those timestamps to be null, so the row remained effectively revoked.

- [x] `11b70128` clears revoked/deleted metadata when provisioning reactivates an assignment
- [x] Reactivation deliberately does **not** write `appRoleId`, preserving a later admin role choice
- [x] `55a72c9e` adds a focused repository regression test for both invariants
- [ ] Execute the new test under C4 runtime verification

### Required checks — NOT YET EXECUTED

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

### Local checkout/formatter checks still required

The PR diff audit above covers committed-content escape/security patterns, but it
cannot prove local working-tree state or execute formatters.

- [ ] `git status --short` clean after intended commits
- [ ] No incidental local lockfile churn
- [ ] Run repository-required formatter/linter on changed closeout code

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

## C6 — Final issue cleanup, closeout report, and PR — DRAFT PR OPEN / EXTERNAL GATES REMAIN

### C6.1 PROJ-10 — EXTERNAL TRACKER BLOCK

The repository's GitHub Issues search returned no `PROJ-10`, so it appears to live in another tracker rather than GitHub Issues. A Linear integration is available and has been surfaced for connection; once connected, search `PROJ-10` there before attempting any rewrite/close action.

- [ ] Locate the actual tracker containing PROJ-10
- [ ] Close it if it only claims `comments.create` is missing from the catalog
- [ ] Or rewrite it around the real org-role → app-role assignment defect/backfill requirement
- [x] Do not create a duplicate GitHub issue just because the key is absent here
- [x] Surface the Linear integration as the most likely next issue-tracker lookup path

### C6.2 Branch/readiness audit

- [x] Branch 0 commits behind `main` at latest comparison
- [x] Latest audited branch comparison: 39 commits ahead / 0 behind before this tracker update
- [x] PR #478 reports mergeable with no base conflict
- [x] PR-wide committed diff quality/security scan completed
- [x] Changed-file list contains no environment file
- [x] Changed-file list contains no delegated `*-run.log` transcript
- [x] Branch commit listing searched for `Co-Authored-By`: no matches
- [x] Branch commit listing searched for `Generated with`: no matches
- [x] Branch commit listing searched for `Claude`: no matches
- [x] Older descriptive `Codex` mentions are repository documentation, not contributor attribution
- [x] GitHub retry policy saved with exact PR/workflow/job references
- [ ] Re-check `main` divergence immediately before ready-for-review because `main` may advance
- [ ] Confirm local working tree / formatter state after C4 runtime work

### C6.3 Closeout reporting

- [x] Add repository-side closeout progress report: `reports/orchestrator/2026-09-05-closeout-progress.md`
- [x] Align Phase 4 to complete-in-code
- [x] Correct runtime verification commands to target the actual Projects app workspace
- [x] Open draft PR #478 as the CI harness
- [x] Record and reproduce the Actions pre-step infrastructure failure
- [x] Save GitHub connector retry semantics and references
- [x] Record/fix the provisioning replay lifecycle defect with regression coverage
- [ ] Update the orchestrator report with the latest reactivation/diff-audit findings
- [ ] Reconcile `plan.md` with draft PR #478, Actions status, corrected commands, and replay fix
- [ ] Mark `plan.md` `COMPLETED ✅` only after C3-C5 pass
- [ ] Mark this TODO `COMPLETED` only after C3-C5 pass

### C6.4 Integration PR #478

The single integration PR exists as **draft #478**. Do not mark it ready or merge it while C3-C5 remain unverified.

- [x] Open one integration PR: `feat/shell-layout-navigation-overhaul` → `main`
- [x] Keep it draft while runtime acceptance is incomplete
- [x] Describe the entire overhaul rather than only the editor closeout
- [x] Lead with the two platform defects found: Tailwind shared-UI source coverage and app-role assignment ignoring org role
- [x] Confirm current PR has no merge conflict
- [x] Inspect comments/reviews/review threads: none currently present
- [ ] Restore Actions execution and obtain real CI results
- [ ] Complete C3 production repair + permission smoke test
- [ ] Complete C5 browser acceptance
- [ ] Update PR body with exact final verification evidence and replay-hardening fix
- [ ] Mark PR ready for review only after all acceptance gates pass
- [ ] Inspect review threads/status checks again after real CI executes
- [ ] Resolve all actionable automated-review findings before merge

---

## Compact live checklist

### Repository-side work completed

- [x] C1 shared Markdown editor redesign
- [x] C1 Projects create/edit composer integration
- [x] C1 focused regression coverage
- [x] C1 static API/escape audit
- [x] C2 remove `ProjectDetail.projectsHref` residue
- [x] C2 correct stale shell-spacing report
- [x] C2 update Projects report
- [x] C4 static workspace/filter audit and command correction
- [x] C4 open draft PR as CI harness
- [x] C4 retry and reproduce current Actions pre-step failure
- [x] C4 PR-wide diff quality/security audit
- [x] C4 fix provisioning assignment reactivation lifecycle
- [x] C4 add focused replay regression coverage
- [x] C6 repository-side closeout progress report
- [x] C6 current branch divergence/conflict audit
- [x] C6 commit attribution audit
- [x] C6 changed-file env/run-log hygiene audit
- [x] C6 save GitHub connector retry rule
- [x] C6 surface Linear integration for PROJ-10 lookup
- [x] C6 surface Neon integration for production DB access
- [x] C6 draft integration PR #478

### Runtime/external work still open

- [ ] Restore GitHub Actions runner/account availability or use another executable checkout
- [ ] C3 production backfill dry-run
- [ ] C3 production assignment repair
- [ ] C3 effective-permission re-read
- [ ] C3 production comment smoke test
- [ ] C4 execute full integration command matrix
- [ ] C4 local formatter/working-tree gate
- [ ] C4 production-build coverage
- [ ] C5 light/dark browser acceptance
- [ ] C5 production permission acceptance
- [ ] C6 resolve PROJ-10 in its actual tracker
- [ ] C6 update closeout report and plan to latest state
- [ ] C6 final acceptance report update
- [ ] C6 complete `plan.md`/TODO after acceptance
- [ ] C6 mark PR #478 ready for review
