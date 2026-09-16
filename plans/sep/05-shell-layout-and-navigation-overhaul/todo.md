# Shell Layout, Navigation & Permissions Overhaul — Runtime Acceptance TODO

- **Run:** `2026-09-05-shell-layout-and-navigation-overhaul`
- **Branch:** `feat/shell-layout-navigation-overhaul`
- **Status:** `MERGED_TO_MAIN_PRODUCTION_BACKFILL_OPEN`
- **Updated:** 2026-09-05
- **Design/history:** `plan.md`
- **Final repository review:** `reports/orchestrator/2026-09-05-final-report.md`

The repository-side implementation and static review are complete. This tracker
now contains only work that still requires an executable environment,
production/authenticated access, or an external tracker.

## PR policy

The user approved the pull request on 2026-09-05. **PR #479 is merged into
`main`** (merge commit `914443a3`). Draft PR #478 remains closed and unmerged.

Every check on #479 was red, and every check on `main` is red the same way:
each job fails in ~2s without starting. That is the standing Actions runner
block, not a signal about this branch.

---

## Repository implementation — COMPLETE IN CODE

- [x] Phase 1 — shared product-UI Tailwind `@source` coverage
- [x] Phase 2 — shared shell spacing contract
- [x] Phase 3 — semantic/distinct sidebar icons
- [x] Phase 3 — persisted collapsible Projects sidebar
- [x] Phase 4 — full-page Projects project/issue records
- [x] Phase 4 — record loading/Suspense boundaries
- [x] Phase 4 — Markdown/comment editor light/dark redesign
- [x] Phase 4 — comment create/edit draft-preserving error behavior
- [x] Phase 5 — Console full-page project/issue records
- [x] Phase 5 — shared `@876/projects-ui` record reuse
- [x] Phase 6 — guarded Console `/workspace` hub
- [x] Phase 6 — duplicate workspace organization heading removed
- [x] Phase 7 — permission grouping product → module → permission
- [x] Phase 8 — organization-role → app-role assignment mapper
- [x] Phase 8 — dry-run-by-default existing-assignment backfill

## Final repository review — COMPLETE

### Assignment compatibility and lifecycle

- [x] Preserve exact legacy persisted app-role alias `super_admin` → `super-admin`
- [x] Keep arbitrary custom app-role keys case-sensitive (`ADMIN` must not widen)
- [x] Reactivation clears revoked/deleted lifecycle metadata
- [x] Provisioning replay does not overwrite an administrator-selected app role
- [x] Add focused core/API regression coverage

### Backfill safety

- [x] Dry-run performs zero writes
- [x] Candidate output contains assignment/org/user/app/from/to/org-role context
- [x] Apply uses compare-and-set on the discovered assignment state
- [x] Revalidate the member's active organization role before apply
- [x] Re-fetch live app roles and rerun role resolution immediately before apply
- [x] Skip stale candidates rather than overwriting concurrent changes
- [x] Report `changed` and `skippedAfterDiscovery`
- [x] Cover dry-run, apply, stale membership, and stale target resolution in API tests

### Navigation collision audit

- [x] Console root/drill-down rails use distinct semantic icons
- [x] Projects app rail uses distinct semantic icons
- [x] Console Projects workspace uses Projects/Issues/Board/Labels semantic icons
- [x] Add collision coverage for every `APP_WORKSPACES` section rail
- [x] Billing rail uses a distinct icon registry; add collision test
- [x] Invoice rail uses a distinct icon registry; add collision test
- [x] Couriers visible rail audited — already distinct
- [x] CRM visible rail audited — already distinct

### Other static review

- [x] Verify `Page hub` wider padding is an intentional binding-layout exception
- [x] Verify Tailwind source checker/shared UI registry contract
- [x] Verify permission grouping helpers and `/workspace` data path
- [x] Verify Billing/Invoice new nav tests are inside each Vitest include pattern
- [x] Current branch changed-file inventory contains no newly changed `.env` file
- [x] Current branch changed-file inventory contains no delegated `*-run.log`
- [x] Branch commit collection contains no `Co-Authored-By`
- [x] Branch commit collection contains no `Generated with`
- [x] Branch commit collection contains no `Claude` attribution string
- [x] Final repository report written

---

# Runtime acceptance still open

## C3 — Production app-assignment repair

Diagnosed production record:

- organization: `org_fa2cfb0bce834ae6a6537830159e5f14`
- app assignment: `asg_90275575846147508476c7e2b16c4335`
- diagnosed app role: default `staff`
- expected mapped role: `super-admin`
- missing write permission at diagnosis: `comments.create`

### C3.1 Dry-run

```bash
pnpm --filter @876/api app-access:backfill-roles
```

- [ ] Confirm the environment intentionally points at production
- [ ] Confirm `dryRun: true`
- [ ] Confirm `changed: 0`
- [ ] Review every candidate
- [ ] Confirm the Efesto Projects assignment appears if still stale
- [ ] Confirm ordinary staff/member assignments are not widened unexpectedly

### C3.2 Apply only after candidate review

```bash
pnpm --filter @876/api app-access:backfill-roles --apply
```

- [ ] Apply only when every candidate is expected
- [ ] Record actual `changed` and `skippedAfterDiscovery`
- [ ] If any candidate is stale/surprising, rerun dry-run before another apply
- [ ] Record Efesto old/new role IDs without storing credentials

### C3.3 Effective-permission verification

- [ ] Re-read the Efesto app membership
- [ ] Confirm role is `super-admin`
- [ ] Confirm effective permissions include `comments.create`
- [ ] Confirm expected project/issue write permissions are present
- [ ] Confirm no explicit deny removes `comments.create`
- [ ] Confirm assignment is active, not revoked, and not deleted

### C3.4 Production comment smoke test

- [ ] Create a non-sensitive comment on a real Efesto issue
- [ ] Confirm the request no longer returns `Forbidden.`
- [ ] Edit the comment
- [ ] Delete the comment
- [ ] Confirm an ordinary staff/default-role subject still fails closed for writes it lacks

No production mutation is recorded as completed by this tracker.

---

## C4 — Executable verification matrix

### Formatting

```bash
pnpm format:check
```

- [x] Branch-owned files formatted and verified. A repo-wide `pnpm format:check`
      still reports ~277 pre-existing files; per `.claude/rules/git.md` those
      were deliberately left alone rather than committed as churn.

### Touched applications

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test

pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test

pnpm --filter @876/crm-app typecheck
pnpm --filter @876/crm-app lint
pnpm --filter @876/crm-app test

pnpm --filter @876/billing-app typecheck
pnpm --filter @876/billing-app lint
pnpm --filter @876/billing-app test

pnpm --filter @876/invoice-app typecheck
pnpm --filter @876/invoice-app lint
pnpm --filter @876/invoice-app test

pnpm --filter @876/couriers-app typecheck
pnpm --filter @876/couriers-app lint
pnpm --filter @876/couriers-app test
```

- [x] Console typecheck/lint/test — 1682 pass, 1 pre-existing billing snapshot failure; lint matches main (0 errors, 21 warnings)
- [x] Projects app typecheck/lint/test — 222 pass, 16 pre-existing settings/users failures (identical on main)
- [x] CRM typecheck/lint/test — pre-existing settings/users failures only (identical on main)
- [x] Billing typecheck/lint/test — 745 pass
- [x] Invoice typecheck/lint/test — 215 pass
- [x] Couriers typecheck/lint/test — 770 pass, 1 pre-existing storage-code snapshot failure

### Shared packages and API

```bash
pnpm --filter @876/projects-ui typecheck
pnpm --filter @876/projects-ui test

pnpm --filter @876/ui typecheck
pnpm --filter @876/ui test

pnpm --filter @876/api typecheck
pnpm --filter @876/api lint
pnpm --filter @876/api test
pnpm --filter @876/api boundaries

pnpm --filter @876/core typecheck
pnpm --filter @876/core test

pnpm --filter @876/editor typecheck
pnpm --filter @876/editor test

node scripts/check-app-structure.mjs
pnpm check:transpile
```

- [ ] Projects UI typecheck/test
- [ ] UI typecheck/test
- [ ] API typecheck/lint/test
- [ ] Core typecheck/test
- [ ] Editor typecheck/test
- [ ] App-structure check
- [ ] Shared transpile/Tailwind-source check

### Boundary baseline

- [ ] Run `pnpm --filter @876/api boundaries`
- [ ] Confirm only the known 18 pre-existing `no-circular` violations remain
- [ ] Confirm no nineteenth violation was introduced

### Production builds

```bash
pnpm --filter @876/console build
pnpm --filter @876/projects-app build
pnpm --filter @876/crm-app build
pnpm --filter @876/billing-app build
pnpm --filter @876/invoice-app build
pnpm --filter @876/couriers-app build
```

- [ ] Console build
- [ ] Projects build
- [ ] CRM build
- [ ] Billing build
- [ ] Invoice build
- [ ] Couriers build

### Local checkout hygiene

- [ ] `git status --short` is clean after intended commits
- [ ] No incidental lockfile churn

Current GitHub state is **not** a substitute for these commands. The final
implementation head had no attached commit-status checks and no PR-triggered
workflow runs because the historical PR is closed. Earlier PR workflow runs
failed before step 1 with empty step lists and no logs; that was an Actions
execution block, not a green or red code result.

---

## C5 — Browser acceptance

Run each required surface in light and dark at:

- [ ] 1280px
- [ ] 1440px
- [ ] 1920px

Required surfaces:

- [ ] Console `/settings/users/.../permissions`
- [ ] Console `/requests`
- [ ] Console `/settings/users`
- [ ] Console project detail
- [ ] Console issue detail
- [ ] Console org-workspace project detail
- [ ] Console org-workspace issue detail
- [ ] Console `/workspace`
- [ ] Console role permission editor/detail
- [ ] Console Projects workspace rail
- [ ] Projects sidebar collapsed + expanded persistence
- [ ] Projects project detail
- [ ] Projects issue detail
- [ ] Projects comment create/edit composer
- [ ] Billing rail
- [ ] Invoice rail

Acceptance rules:

- [ ] Ordinary routed shell/list/content insets read as one rhythm
- [ ] No list pane visually touches the sidebar
- [ ] No visible rail has duplicate semantic icons
- [ ] Projects rail defaults collapsed and persists expansion state
- [ ] Project/issue records own the page
- [ ] Project summary facts render in the intended row
- [ ] Workspace header renders organization name once
- [ ] `/workspace` behaves as a navigation hub
- [ ] Permissions read product → module → permission
- [ ] Markdown editor has clear light/dark surfaces and focus/mode states
- [ ] Comment create/edit errors remain in-page and preserve drafts
- [ ] Repaired Efesto super-admin can create/edit/delete comments
- [ ] Staff/default role remains fail-closed for writes it lacks

---

## C6 — External tracker

`PROJ-10` is not present in this repository's GitHub Issues. Its original
catalog-permission premise is false; `comments.create` already exists in the
Projects catalog/system roles.

- [ ] Locate `PROJ-10` in its owning external tracker
- [ ] Close it if it only claims the comment permission is absent
- [ ] Or rewrite it around the actual organization-role → app-role/backfill defect
- [x] Do not create a duplicate GitHub issue

---

## Completion rule

Do not mark this run fully accepted until C3, C4, C5, and C6 have genuine
runtime/external evidence.

Repository implementation/static review is complete; remaining unchecked items
are deliberately not inferred from source inspection.

**PR actions remain approval-gated.** No PR creation/reopen/readiness/merge step
is part of this tracker unless the user explicitly requests it later.
