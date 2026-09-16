# Shell overhaul closeout progress

## Scope

This report records repository-side closeout work performed directly on
`feat/shell-layout-navigation-overhaul` after the original phase implementation.
It is **not** the final acceptance report: production data repair, executable
verification, and authenticated browser acceptance remain open in `../../todo.md`.

---

## Repository implementation completed

### C1 — Markdown/comment editor

Commit `0ed9cb34` completed the remaining Phase 4 editor work:

- deliberate token-based light/dark Markdown editor surfaces;
- explicit Write/Preview state via `aria-pressed` + `data-mode`;
- shared focus-within ring/border treatment;
- responsive toolbar and semantic shared icons where canonical icons exist;
- existing Markdown storage/rendering and keyboard shortcuts preserved;
- Projects create/edit comment composition aligned around the same editor;
- create/update errors remain inline and preserve drafts;
- 8 focused editor/comment regression cases added.

`@876/editor` remains Editor.js-based infrastructure and was deliberately not
substituted into comments because the product contract stores Markdown text.

### C2 — compatibility/documentation cleanup

- `242702ef` removed obsolete `ProjectDetail.projectsHref` compatibility residue.
- `4de19178` corrected the stale shell-spacing report and updated the Projects
  phase report.
- `6db88a11` corrected the final Projects application verification target from
  `@876/projects` to `@876/projects-app`.
- `4952cd23` reconciled `plan.md` with the then-current draft-PR/Actions/replay
  state.

---

## Static quality and ownership audit

### Editor/API contracts

Static inspection verified:

- Markdown toolbar icon imports exist in `@876/ui/icons`;
- `IconComponent` matches the toolbar component contract;
- shared Button variants/sizes used by the editor exist;
- Projects continues to consume the canonical shared Markdown editor;
- no comment storage/transport contract changed.

### PR-wide committed diff audit

While draft PR #478 was open, the complete patch was inspected. In changed
production/test code:

- no `as any`;
- no `eslint-disable`;
- no `@ts-ignore`;
- no `as unknown as` escape;
- no `FIXME` marker;
- no API-key/password assignment pattern;
- no private-key block;
- no new environment file;
- no delegated `*-run.log` transcript.

The only added `console.log` calls are intentional operational/check-script
output. This is a committed-diff audit, not a substitute for final formatter,
lint, typecheck, test, build, or working-tree verification.

---

## Phase 8 closeout hardening

### Provisioning replay lifecycle

Static review found a real lifecycle defect on the same assignment replay path:
provisioning could set a revoked assignment to `status: 'active'` while leaving
`revokedAt`/`deletedAt` populated. Effective permission resolution therefore
still treated the row as inactive.

`11b70128` now clears:

- `revokedAt` / `revokedBy`;
- `deletedAt` / `deletedBy`;
- `deletionReason`.

It deliberately does **not** write `appRoleId` during replay, preserving a later
administrator-selected app role. `55a72c9e` adds focused regression coverage for
genuine reactivation and role preservation.

### Backfill compare-and-set safety

The original backfill was dry-run by default but `--apply` updated by assignment
ID after candidate discovery. Closeout review hardened this for production use:

- `5b6dfe7e` changed apply writes to compare-and-set `updateMany` against the
  discovered source role and active/non-deleted/non-revoked lifecycle state;
- the current role must still be a live default role;
- concurrent/manual app-role changes therefore win instead of being overwritten;
- actual successful writes determine `changed`;
- stale candidates contribute to `skippedAfterDiscovery`.

`99122d33` added immediate pre-write revalidation:

- target user must still have the same active organization role;
- target app role must still exist live for the same organization/application;
- dry-run candidates include organization, user, and app ids so operators can
  review the real scope before applying.

### Backfill regression coverage

The API Vitest config only discovers `src/**/*.{test,spec}.ts`, so operational
script coverage was deliberately placed under the API `src/` test tree.

`7a419d08` / `6ca403e3` now cover:

1. default invocation is a dry-run and performs **zero writes** even when a
   candidate exists;
2. apply revalidates the membership/target role and compare-and-sets the original
   assignment state;
3. a candidate whose organization role changed after discovery is skipped.

These cases are added to the real API suite but remain **unexecuted** until C4
has a working runtime.

---

## GitHub connector retry rule

Per the user's explicit instruction, GitHub timeouts, temporary rate limits, and
transient connector errors are never treated as exhausted access. Required
operations retain their exact repository/branch/PR/SHA/run/job/path references
and are retried after a short gap.

The rule is saved at `../../notes/github-tool-retry.md` and was exercised during
the Actions investigation.

---

## GitHub Actions / PR history

### PR #478 while open

Draft PR #478 was opened as the single integration PR and CI harness. It was
confirmed mergeable while open.

Across multiple independent branch heads, the repository's pull-request
workflows triggered but failed **before step 1**:

- UI tests;
- App structure;
- API container image;
- Billing API quality;
- Billing API container image;
- Couriers API container image.

Affected jobs repeatedly returned empty step lists and no job-log blobs. GitHub
reads were retried after gaps, and later commits generated fresh run/job ids with
the same result. This is a reproducible Actions/runner-account execution block,
not a connector timeout and not evidence of a repository test/compiler failure.

### PR #478 external close

At `2026-09-05T13:18:08Z`, PR #478 was closed **without merge** by the
`876-workspace` account. The event was not performed by a GitHub App and contains
no reason/comment.

The close was an external/account action, so this session did **not** silently
reopen it. Its last recorded PR head was `4952cd234cd47898127ea3362ff971497aad6d7c`;
later branch hardening commits are not represented by that closed PR snapshot.

When final PR work is intentionally resumed, prefer reopening #478 rather than
creating a duplicate, then confirm it points at the current branch head.

---

## Current branch state

Immediately before the latest tracker/report reconciliation, GitHub comparison
reported:

- status: `ahead`;
- ahead by: **47 commits**;
- behind by: **0 commits**;
- merge base: `1419aaee85264ed4c278d952af6e4687383df157`.

This report commit advances the branch again. Exact divergence must always be
re-read before final readiness.

---

## Runtime work still open

### C3 — production data repair

No production mutation has been performed. The current safe order is:

```bash
pnpm --filter @876/api app-access:backfill-roles
# review every candidate
pnpm --filter @876/api app-access:backfill-roles --apply
```

The production dry-run must confirm `dryRun: true`, `changed: 0`, and expected
candidate scope before apply. If apply reports `skippedAfterDiscovery > 0`, rerun
dry-run before any subsequent write attempt.

A Neon integration was surfaced as a possible Postgres access path but remains
unconnected.

### C4 — executable verification

Still required:

- Console typecheck/lint/test;
- Projects app typecheck/lint/test (`@876/projects-app`);
- Projects UI typecheck/test;
- UI typecheck/test;
- API typecheck/lint/test including replay/backfill tests;
- Core typecheck/test;
- Editor typecheck/test;
- app structure + shared transpile checks;
- API boundaries against the known 18-cycle baseline;
- production builds;
- local formatter/working-tree/lockfile confirmation.

The current local container cannot replace CI because it has no repo checkout or
pnpm and cannot obtain the repo/toolchain through its shell network path.

### C5 — browser acceptance

Still requires an authenticated Console/Projects browser session for the
1280/1440/1920 light/dark matrix and the real Efesto comment workflow.

### PROJ-10

No `PROJ-10` exists in this repository's GitHub Issues. Linear was surfaced as
the likely external tracker integration but remains unconnected. Do not create a
duplicate GitHub issue.

---

## Final readiness gate

Repository-side implementation and static hardening are complete to the extent
possible without a runtime. The feature is **not accepted yet**.

Before `main`:

1. execute/review the production dry-run and repair;
2. prove effective permissions and real comment create/edit/delete behavior;
3. run the full command/build/boundary matrix;
4. complete browser acceptance;
5. resolve PROJ-10 in its real tracker;
6. update plan/TODO/final report with exact evidence;
7. re-check divergence, attribution, security, and working-tree state;
8. intentionally reopen/update PR #478 (preferred over a duplicate), inspect
   real CI/reviews, and only then mark it ready.
