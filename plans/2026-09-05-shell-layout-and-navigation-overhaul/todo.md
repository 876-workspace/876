# Shell Layout, Navigation & Permissions Overhaul — Closeout TODO

- **Run:** `2026-09-05-shell-layout-and-navigation-overhaul`
- **Branch:** `feat/shell-layout-navigation-overhaul`
- **Tracker type:** live execution checklist for remaining work
- **Status:** `CLOSEOUT_BLOCKED_ON_RUNTIME_AND_EXTERNAL_ACCESS`
- **Updated:** 2026-09-05
- **Relationship to `plan.md`:** `plan.md` is the design/history record. This file is the operational source of truth for what still has to happen before the branch is ready for `main`.

---

## Current state

Latest audited branch state before this tracker commit:

- head: `6ca403e34367c18ee71cffd01234486133ed4e99`
- **46 commits ahead of `main`**
- **0 commits behind `main`**
- merge base: `1419aaee85264ed4c278d952af6e4687383df157`

This tracker commit advances the head again; always re-read exact divergence before final readiness.

### PR state

- Integration PR **#478** was opened as a draft CI harness.
- It was confirmed mergeable while open.
- At `2026-09-05T13:18:08Z`, PR #478 was **closed without merge** by the `876-workspace` account.
- The close event was not performed by a GitHub App and contains no reason/comment.
- Its last recorded PR head was `4952cd234cd47898127ea3362ff971497aad6d7c`; later branch hardening commits are therefore not represented by that closed PR snapshot.
- Do **not** reopen it automatically in this run: the close was an external/account action. Prefer reopening the same PR rather than creating a duplicate only when final PR work is intentionally resumed.

### GitHub retry rule

A GitHub timeout, transient rate limit, or temporary connector error is **not** exhaustion.

- [x] Preserve the repository/branch/PR/SHA/run/job/path reference.
- [x] Retry required GitHub operations after a short gap.
- [x] Retry again when the failure is still plausibly transient.
- [x] Distinguish connector/API errors from stable GitHub Actions runner failures.

Run-specific reference note: `notes/github-tool-retry.md`.

### Historical Actions finding while PR #478 was open

Across multiple separate PR heads, these workflows repeatedly failed before executing step 1:

- UI tests
- App structure
- API container image
- Billing API quality
- Billing API container image
- Couriers API container image

The failing jobs exposed empty step lists and no job log blobs. Reads were retried after gaps, and fresh commits generated new run/job ids with the same result. This is a reproducible **Actions/runner-account execution block**, not a connector timeout and not evidence of a test/compiler failure.

After PR #478 was externally closed, later branch commits no longer received pull-request workflow runs. C4 therefore still needs either a restored/reopened PR workflow path or another executable checkout.

---

# Original implementation phases

- [x] Phase 1 — shared product-UI Tailwind source coverage
- [x] Phase 2 — shared shell spacing contract
- [x] Phase 3 — semantic sidebar icons + collapsible Projects sidebar
- [x] Phase 4 — Projects full-page records + Markdown/comment editor
- [x] Phase 5 — Console full-page record alignment
- [x] Phase 6 — Console `/workspace` hub
- [x] Phase 7 — product → module → permission grouping
- [x] Phase 8 — durable org-role → app-role assignment mapping

All original phases are complete **in code**. Remaining work is closeout/acceptance.

---

# C1 — Markdown/comment editor — COMPLETE IN CODE

**Primary commit:** `0ed9cb34`

- [x] Deliberate token-based light/dark editor surface
- [x] Distinct toolbar/body surfaces
- [x] Shared focus-within border/ring contract
- [x] Explicit Write/Preview state with `aria-pressed` + `data-mode`
- [x] Responsive formatting toolbar
- [x] Semantic shared icons where canonical icons exist
- [x] Accessible names/tooltips preserved
- [x] Bold/italic/link keyboard shortcuts preserved
- [x] Preview renderer/storage remains Markdown text
- [x] Disabled state applies to modes, tools, and textarea
- [x] New-comment and edit-comment composers share the same editor
- [x] Create/update errors stay inline and preserve drafts
- [x] 5 focused shared-editor regression cases added
- [x] 3 focused Projects comment-composition regression cases added
- [x] Static imports/Button-contract review completed
- [x] C1 diff contains no new `as any`, `eslint-disable`, or `@ts-ignore`

Still acceptance-gated by C4/C5 runtime checks.

---

# C2 — Compatibility + documentation reconciliation — COMPLETE

**Primary commits:** `242702ef`, `4de19178`, `4952cd23`

- [x] Remove dead `ProjectDetail.projectsHref` prop
- [x] Remove final Console caller
- [x] Preserve unrelated list-level `projectsHref` contracts
- [x] Correct shell-spacing report to Tailwind v4 `calc(var(--spacing) * 4/6/8)` expressions
- [x] Update Projects phase report with editor work/tests
- [x] Preserve Markdown-vs-Editor.js decision
- [x] Mark Phase 4 complete in code
- [x] Correct final Projects app verification filter to `@876/projects-app`
- [x] Reconcile `plan.md` with draft PR/Actions/replay-hardening state through `4952cd23`

### Remaining documentation delta after later C3 hardening

- [ ] Update `plan.md` with compare-and-set/revalidation backfill hardening (`5b6dfe7e`, `99122d33`, `6ca403e3`)
- [ ] Update orchestrator closeout report with the same backfill hardening and PR-closed state

---

# C3 — Production app-assignment repair — CODE SAFETY COMPLETE / PRODUCTION EXECUTION OPEN

Affected production diagnosis:

- organization: `org_fa2cfb0bce834ae6a6537830159e5f14`
- assignment: `asg_90275575846147508476c7e2b16c4335`
- diagnosed role: default `staff`
- expected role: `super-admin`
- missing permission: `comments.create`

## C3.0 Durable assignment behavior — COMPLETE IN CODE

- [x] `super_admin` / `super-admin` org role maps to app `super-admin`
- [x] `admin` maps to app `admin`
- [x] ordinary/unknown org role falls back to the live default app role
- [x] deleted roles are ignored
- [x] explicit requested-role path remains guarded for super-admin elevation
- [x] automatic provisioning derives from the target membership's org role
- [x] replay does not overwrite a later administrator-selected `appRoleId`

## C3.1 Provisioning replay lifecycle hardening — COMPLETE IN CODE

Static closeout review found that replay could set `status: active` while leaving revocation/deletion timestamps populated, which still makes permission resolution treat the assignment as inactive.

- [x] `11b70128` clears `revokedAt` / `revokedBy`
- [x] `11b70128` clears `deletedAt` / `deletedBy` / `deletionReason`
- [x] replay still does **not** write `appRoleId`
- [x] `55a72c9e` adds focused regression coverage for genuine reactivation + role preservation
- [ ] Execute this regression test under C4

## C3.2 Backfill safety hardening — COMPLETE IN CODE

The operational backfill is now designed to be reviewable and resistant to stale-candidate races.

- [x] default invocation remains dry-run
- [x] dry-run candidate output now includes `organizationId`, `userId`, and `appId` in addition to assignment/from/to role ids and org role
- [x] `5b6dfe7e` changed apply writes from unconditional `update` to compare-and-set `updateMany`
- [x] apply requires the assignment to still have the discovered `fromRoleId`
- [x] apply requires status active, non-deleted, non-revoked lifecycle state
- [x] apply requires the current role to still be a live default role
- [x] `99122d33` revalidates that the user still has the same active organization role immediately before write
- [x] `99122d33` revalidates that the target app role still exists/live for the same org/app
- [x] concurrent/manual role changes win instead of being overwritten
- [x] output records `changed` from actual successful writes
- [x] output records `skippedAfterDiscovery` for stale/racing candidates
- [x] tests live under the API suite's actual `src/**` Vitest include pattern
- [x] `7a419d08` covers compare-and-set + stale org-role skip
- [x] `6ca403e3` adds the explicit default-dry-run/no-write regression
- [ ] Execute the 3 backfill-script regression cases under C4

## C3.3 Production dry-run — OPEN

```bash
pnpm --filter @876/api app-access:backfill-roles
```

- [ ] Confirm environment intentionally points to production
- [ ] Capture JSON summary
- [ ] Confirm `dryRun: true`
- [ ] Confirm `changed: 0`
- [ ] Review every candidate with org/user/app context
- [ ] Confirm ordinary staff/member subjects are not widened
- [ ] Confirm revoked/deleted assignments are excluded
- [ ] Confirm Efesto Projects assignment appears if it is still stale

A Neon integration has been surfaced as a possible production Postgres access path, but it is **not connected** yet. Do not infer production access from plugin availability.

## C3.4 Production apply — OPEN

Only after reviewing the fresh dry-run produced from the same production environment:

```bash
pnpm --filter @876/api app-access:backfill-roles --apply
```

- [ ] If every candidate is expected, run reviewed apply
- [ ] If any candidate is surprising, do not run global apply; repair only the intended assignment and investigate
- [ ] Record `changed` and `skippedAfterDiscovery`
- [ ] If `skippedAfterDiscovery > 0`, rerun dry-run before considering another apply
- [ ] Record Efesto old/new role ids without storing credentials

## C3.5 Effective-permission verification — OPEN

- [ ] Re-read Efesto app membership
- [ ] Confirm app role is `super-admin`
- [ ] Confirm `comments.create` is effective
- [ ] Confirm expected project/issue write permissions
- [ ] Confirm no explicit deny removes `comments.create`
- [ ] Confirm assignment is active, non-revoked, non-deleted

## C3.6 Production comment smoke test — OPEN

- [ ] Create a non-sensitive test comment on a real Efesto issue
- [ ] Confirm no `Forbidden.` response
- [ ] Edit comment
- [ ] Delete comment
- [ ] Verify a normal staff/default-role subject still fails closed for writes it lacks

---

# C4 — Final executable verification — STATIC AUDIT COMPLETE / RUNTIME BLOCKED

## C4.0 Static command/package audit — COMPLETE

- [x] Projects application workspace verified as `@876/projects-app`
- [x] `@876/projects` identified as product client/contracts package, not app verification target
- [x] exact production-build workspace names verified for Console, CRM, Billing, Invoice, Projects
- [x] role-mapping automatic call sites reviewed
- [x] target membership org role is supplied to resolver
- [x] replay role-preservation path reviewed
- [x] backfill test files are under API Vitest's `src/**/*.{test,spec}.ts` include

## C4.1 PR-wide committed-diff quality/security audit — COMPLETE AT STATIC LEVEL

- [x] changed-code `as any`: none; matches are documentation/rule text only
- [x] changed-code `eslint-disable`: none; matches are documentation/rule text only
- [x] changed-code `@ts-ignore`: none; matches are documentation/rule text only
- [x] changed-code `as unknown as`: none; matches are documentation/rule text only
- [x] no `FIXME` in changed diff
- [x] no committed API-key assignment pattern found
- [x] no committed password assignment pattern found
- [x] no private-key block found
- [x] added `console.log` limited to intentional CLI/check-script output
- [x] changed-file inventory contains no new environment file
- [x] changed-file inventory contains no delegated `*-run.log`

This does not replace formatter/typecheck/test/build execution.

## C4.2 GitHub Actions execution path — BLOCKED

While PR #478 was open, multiple fresh workflow runs failed before step 1 with empty step lists/no logs. PR #478 is now externally closed, so newer heads do not trigger its pull-request workflows.

- [x] Retry old job reads after a gap
- [x] Reproduce no-step failure on fresh run ids while PR was open
- [x] Record as runner/account infrastructure block, not code failure
- [ ] Restore a working Actions execution path, **or** use another real checkout/toolchain
- [ ] If final PR #478 is intentionally reopened, rerun workflows on the then-current head

## C4.3 Required command matrix — OPEN

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

### API boundary baseline

- [ ] Run `pnpm --filter @876/api boundaries`
- [ ] Confirm only the known 18 pre-existing `no-circular` violations remain
- [ ] Confirm no nineteenth violation was introduced

### Local working-tree/formatter gate

- [ ] `git status --short` clean after intended work
- [ ] no incidental lockfile churn
- [ ] run repository-required formatter/linter on closeout changes

## C4.4 Production builds — OPEN

```bash
pnpm --filter @876/console build
pnpm --filter @876/crm-app build
pnpm --filter @876/billing-app build
pnpm --filter @876/invoice-app build
pnpm --filter @876/projects-app build
```

- [ ] Console build
- [ ] CRM build
- [ ] Billing build
- [ ] Invoice build
- [ ] Projects build

---

# C5 — Browser + production acceptance — OPEN

Requires an authenticated Console/Projects browser/runtime.

## Viewport/theme matrix

For each required surface:

- [ ] 1280px light
- [ ] 1280px dark
- [ ] 1440px light
- [ ] 1440px dark
- [ ] 1920px light
- [ ] 1920px dark

## Required surfaces

- [ ] Console permissions/access panel
- [ ] Console role permission editor/detail
- [ ] Console `/requests`
- [ ] Console `/settings/users`
- [ ] Console project detail
- [ ] Console issue detail
- [ ] Console org-workspace project detail
- [ ] Console org-workspace issue detail
- [ ] Console `/workspace`
- [ ] Projects sidebar collapsed + expanded persistence
- [ ] Projects project detail
- [ ] Projects issue detail
- [ ] Projects comment create/edit composer

## Acceptance rules

- [ ] shared sidebar/window/content gutter rhythm is visually consistent
- [ ] list pane does not touch sidebar
- [ ] no duplicate semantic icons within a rail
- [ ] Projects rail defaults collapsed and persists user preference
- [ ] project/issue records own the page rather than legacy split detail
- [ ] project summary does not stack because of missing Tailwind utilities
- [ ] workspace header shows organization name once
- [ ] `/workspace` behaves as a usable hub
- [ ] permissions read product → module → permission
- [ ] Markdown editor reads clearly in both themes and wraps responsively
- [ ] create/edit comment errors preserve drafts in-page
- [ ] repaired Efesto super-admin can create/edit/delete comments
- [ ] staff/default role remains fail-closed

---

# C6 — External issue + final readiness — OPEN

## C6.1 PROJ-10 — EXTERNAL TRACKER

GitHub Issues contains no `PROJ-10`. Linear is available as an integration but is **not connected**.

- [x] Do not create a duplicate GitHub issue
- [x] Surface Linear as likely lookup path
- [ ] Connect/access the actual tracker
- [ ] Locate PROJ-10
- [ ] If it claims comment permissions are missing from the catalog, close it as superseded/incorrect premise
- [ ] Otherwise rewrite it around the real org-role → app-role assignment/backfill defect

## C6.2 Repository closeout documents

- [x] dedicated operational `todo.md`
- [x] orchestrator closeout progress report exists
- [x] `plan.md` reconciled through the replay-reactivation fix/draft-PR state
- [x] GitHub connector retry note exists
- [ ] update `plan.md` with the final backfill compare-and-set/revalidation changes and PR-closed state
- [ ] update orchestrator report with the same final static hardening
- [ ] after C3-C5, write exact final acceptance evidence
- [ ] mark plan `COMPLETED ✅`
- [ ] mark TODO `COMPLETED`

## C6.3 Attribution/readiness

- [x] no `Co-Authored-By` matches in audited branch commit history
- [x] no `Generated with` matches
- [x] no Claude attribution matches
- [x] descriptive historical Codex references identified as documentation, not attribution
- [x] latest audited branch is 0 behind `main`
- [ ] re-check divergence immediately before final PR readiness
- [ ] re-check changed files/secrets/attribution after any further code changes
- [ ] complete local working-tree/formatter gate

## C6.4 Final PR

PR #478 is **closed, unmerged** after an external/account action.

- [x] one integration PR was created historically
- [x] it was mergeable while open
- [x] it was kept draft while acceptance was incomplete
- [x] external close event recorded rather than silently reversed
- [ ] when final PR work is intentionally resumed, prefer reopening #478 instead of creating a duplicate
- [ ] ensure reopened PR points at the then-current branch head
- [ ] update body with final C3/C4/C5 evidence
- [ ] inspect CI/status checks/reviews/threads
- [ ] resolve all actionable findings
- [ ] mark ready only after all acceptance gates pass
- [ ] merge only after explicit final acceptance

---

# Compact live checklist

## Repository/code closeout completed

- [x] editor redesign + Projects composer integration
- [x] editor/comment focused regression coverage
- [x] full-page Projects/Console record alignment
- [x] workspace/permissions/navigation/shell phases
- [x] app-role mapping durable code path
- [x] provisioning replay lifecycle hardening
- [x] replay regression coverage
- [x] backfill compare-and-set hardening
- [x] backfill membership/target-role revalidation
- [x] richer dry-run candidate context
- [x] backfill dry-run/apply/stale-candidate regression coverage added to API suite
- [x] PR-wide static security/escape audit
- [x] GitHub retry rule saved
- [x] PR #478 external close state recorded

## Still open

- [ ] C3 connect/access production database/runtime
- [ ] C3 production dry-run
- [ ] C3 candidate review
- [ ] C3 production apply/targeted repair
- [ ] C3 effective-permission re-read
- [ ] C3 real comment create/edit/delete smoke test
- [ ] C4 executable typecheck/lint/test matrix
- [ ] C4 API boundaries baseline
- [ ] C4 formatter/working-tree/lockfile gate
- [ ] C4 production builds
- [ ] C5 browser light/dark acceptance
- [ ] C5 production permission acceptance
- [ ] C6 PROJ-10 external tracker cleanup
- [ ] C6 final plan/report refresh after latest backfill hardening
- [ ] C6 final divergence/security/attribution audit
- [ ] C6 intentionally reopen/update PR #478 when acceptance is ready
- [ ] C6 mark ready/merge only after all gates pass
