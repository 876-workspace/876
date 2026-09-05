# Shell overhaul closeout progress

## Scope

This report records the repository-side closeout work performed directly on
`feat/shell-layout-navigation-overhaul` after the original phase implementation.
It is intentionally **not** the final acceptance report: production data repair,
full command verification, and authenticated browser acceptance remain blocked
on runtime access and are tracked in `../../todo.md`.

## Repository-side closeout completed

### C1 — Markdown/comment editor

Commit `0ed9cb34` completed the only remaining Phase 4 implementation item:

- redesigned `@876/ui/markdown-editor` with token-based light/dark surfaces;
- explicit Write/Preview active state (`aria-pressed` + `data-mode`);
- a shared focus-within ring/border contract;
- responsive toolbar layout;
- semantic existing UI icons where there is a canonical match, while retaining
  simple typographic B/I/S marks for formatting concepts without an owned icon;
- existing Markdown storage/rendering and keyboard shortcut contracts preserved;
- Projects create/edit comment composition updated around the same shared editor;
- create/update errors remain inline and preserve drafts;
- 8 focused regression cases added across UI and Projects UI.

The existing Editor.js package was inspected as related infrastructure but was
not substituted into comments because no requirement called for changing the
persisted comment format away from Markdown text.

### C2 — compatibility cleanup

Commit `242702ef` removed the obsolete `ProjectDetail.projectsHref` compatibility
prop and the last Console caller. Hosts now own their breadcrumb/back affordance
without a dead shared prop.

### C2 — report reconciliation

Commit `4de19178`:

- corrected the shell-spacing report from the invalid historical
  `var(--spacing-4/6/8)` notation to Tailwind v4's actual
  `calc(var(--spacing) * 4/6/8)` expressions;
- preserved the explanation of how the invalid form was discovered and fixed;
- updated the Projects record-page report to include editor closeout files,
  tests, the Markdown-vs-Editor.js decision, and compatibility cleanup;
- kept phase-level verification distinct from the still-unrun final matrix.

`plan.md` was subsequently aligned with Phase 4 complete-in-code, while
`todo.md` remains the live operational closeout tracker.

## Static closeout audit

A follow-up static contract review was performed after the C1 implementation.
It verified:

- all new Markdown toolbar icon imports exist in `@876/ui/icons`;
- `IconComponent` is exported by the same registry and matches the component
  contract used by the toolbar;
- the `Button` component supports the used `secondary`, `ghost`, `xs`, and
  `icon-xs` variants/sizes;
- the Projects comment create/edit surfaces continue to consume the canonical
  `@876/ui/markdown-editor` rather than introducing a parallel composer;
- no comment storage or transport contract was changed by the editor redesign.

### PR-wide committed diff audit

Once draft PR #478 existed, the entire pull-request patch was inspected directly.
The changed committed code contains no new escape/security residue hidden outside
C1:

- `as any` — matches are rule/plan text forbidding it, not changed code;
- `eslint-disable` — rule/plan text only;
- `@ts-ignore` — rule/plan text only;
- `as unknown as` — rule/plan text only;
- no `FIXME` markers;
- no API-key assignment pattern;
- no password assignment pattern;
- no private-key block;
- added `console.log` calls are limited to deliberate CLI/check-script output;
- the changed-file inventory contains no environment file and no delegated
  `*-run.log` transcript.

This is a committed-diff audit. It does not replace formatter/linter execution or
a final local `git status`/lockfile check.

### Verification command correction

The original closeout matrix used `pnpm --filter @876/projects ...` for the
Projects application. Static inspection of `apps/projects/package.json` showed
the actual application workspace is `@876/projects-app`; `@876/projects` is the
underlying product client/contracts package.

Commit `6db88a11` corrected `todo.md` so the runtime matrix now targets:

```bash
pnpm --filter @876/projects-app typecheck
pnpm --filter @876/projects-app lint
pnpm --filter @876/projects-app test
```

The production build list now also uses the verified application workspace names:

```bash
pnpm --filter @876/console build
pnpm --filter @876/crm-app build
pnpm --filter @876/billing-app build
pnpm --filter @876/invoice-app build
pnpm --filter @876/projects-app build
```

## Provisioning replay hardening discovered during closeout

Static review of the Phase 8 assignment lifecycle exposed a real defect in
`services/provisioning.repository.ts` that pre-dated the new role mapper but sat
on the same replay path.

`assignApp()` described itself as reactivating revoked assignments, but the upsert
update only changed `status` to `active`. Revocation/deletion timestamps remained
set. `resolveEffectiveAppPermissions()` requires `revokedAt` and `deletedAt` to be
null, so such a row remained effectively revoked despite its active status.

Commit `11b70128` fixes the lifecycle by clearing:

- `revokedAt` / `revokedBy`;
- `deletedAt` / `deletedBy`;
- `deletionReason`.

It deliberately **does not** restore or recompute `appRoleId` on replay. That
preserves Phase 8's invariant that provisioning is creation-only for role
selection and must not overwrite a later administrator role decision.

Commit `55a72c9e` adds focused repository-level regression coverage proving both
reactivation and role preservation. The new test still needs to execute under the
final C4 runtime matrix.

## Branch and PR state at latest audited comparison

Immediately before this report update, GitHub comparison against `main` reported:

- head: `9cae5384863d84937b05a4732d06bc87bd43bedc`
- status: `ahead`
- ahead by: **40 commits**
- behind by: **0 commits**
- merge base: `1419aaee85264ed4c278d952af6e4687383df157`
- draft PR: **#478**
- PR mergeability: **mergeable**

Re-check divergence immediately before marking the PR ready because `main` may
move.

## GitHub connector retry rule

Per the user's explicit instruction, a GitHub timeout, temporary rate limit, or
connector failure is treated as transient rather than as exhausted access. The
exact operation reference is retained and retried after a short gap. The rule
and current workflow/job references are saved in:

`../../notes/github-tool-retry.md`

This retry policy was exercised during the Actions investigation. GitHub reads
succeeded on retry and then fresh branch commits triggered entirely new workflow
runs, allowing connector failures to be distinguished from the stable Actions
runner failure below.

## Verification infrastructure state

Draft PR #478 was opened specifically to trigger the repository's existing
`pull_request` workflows while keeping the feature non-merge-ready.

The workflows do trigger, but every relevant job fails **before step 1**. Across
separate branch heads:

- App structure returns a failed `structure` job with `steps: []` and no logs;
- UI tests returns failed component/browser jobs with empty step lists and no logs;
- API container, Billing API quality/container, and Couriers API container fail
  in the same pre-step manner.

The App structure job/log read was retried after a gap and returned the same
stable result. Later commits triggered fresh runs with new run/job ids and the
same empty-step failure. This is therefore a reproducible Actions/runner-account
execution block, not a GitHub connector timeout and not evidence of code test
failure. The available repository API does not expose the exact account-side
reason.

The local execution container also cannot replace CI:

- no repository checkout exists at `/root/projects/876`;
- `pnpm` is not already installed;
- shell DNS cannot resolve `github.com`;
- Corepack cannot reach `registry.npmjs.org` to obtain pnpm;
- the public branch archive cannot be obtained through the shell network path.

The final C4 matrix therefore still needs an execution environment where step 1
can actually run.

## Git/attribution audit

The branch commit listing was searched for prohibited attribution forms:

- `Co-Authored-By` — no matches
- `Generated with` — no matches
- `Claude` — no matches

`Codex` appears in older descriptive repository documentation about delegated CLI
transcripts. That is not contributor/co-author attribution.

## Runtime work still blocked

### C3 — production data repair

The existing Efesto 876 Projects app assignment still needs a deliberate dry-run
review and repair/backfill. No production mutation has been performed.

The repository documents Neon-backed Postgres database endpoints, and a Neon
integration capable of inspecting/managing those environments has been surfaced.
If connected to the account that owns the relevant production project, it can be
used to identify the correct database and help execute/verify C3 deliberately.

### C4 — final command matrix

Still required:

- Console typecheck/lint/test
- Projects **app** typecheck/lint/test (`@876/projects-app`)
- Projects UI typecheck/test
- UI typecheck/test
- API typecheck/lint/test, including the new reactivation test
- Core typecheck/test
- Editor typecheck/test
- app-structure check
- shared transpile check
- API boundaries confirmation against the known 18-cycle baseline
- outstanding production builds using the exact app workspace names recorded in
  `todo.md`
- local formatter/working-tree/lockfile confirmation

### C5 — browser acceptance

Still requires an authenticated Console/Projects browser session and the full
1280/1440/1920 light/dark matrix, including the real Efesto comment workflow.

### PROJ-10

No `PROJ-10` exists in this repository's GitHub Issues search. It appears to be
an external/product tracker key. A Linear integration is available and has been
surfaced for connection; once connected, search the owning workspace there
before changing or closing the issue. Do not manufacture a duplicate GitHub
issue.

## Final PR gate

Draft PR #478 now exists and is mergeable, but it must stay draft. Do not mark it
ready or merge while C3-C5 remain unverified. Once those gates are genuinely
green, update the plan/TODO and this report with exact evidence, re-check branch
sync/attribution/security state, refresh the PR body, and mark the single
integration PR ready for review.
