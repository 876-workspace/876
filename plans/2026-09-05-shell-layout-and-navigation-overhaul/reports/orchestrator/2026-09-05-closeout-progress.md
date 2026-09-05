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
- the C1 diff contains no `as any`, `eslint-disable`, or `@ts-ignore` escape;
- no comment storage or transport contract was changed by the editor redesign.

This is a **static API/ownership audit**, not a substitute for TypeScript,
Vitest, ESLint, build, or browser execution.

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

## Branch state at the latest audited comparison

Immediately before the verification-command correction, GitHub comparison
against `main` reported:

- status: `ahead`
- ahead by: **33 commits**
- behind by: **0 commits**
- merge base: `1419aaee85264ed4c278d952af6e4687383df157`

The tracker/report corrections add repository-only commits after that snapshot,
so exact ahead/head values must continue to be re-read rather than copied
forward. Divergence must be checked again immediately before the final PR.

## Verification infrastructure state

GitHub reports **no Actions runs** for this branch and no commit-status entries
on the audited closeout head. Therefore the absence of red checks is not a green
CI signal.

The available execution container has Node 22 and Corepack, but:

- no repository checkout exists at `/root/projects/876`;
- `pnpm` is not already installed;
- shell DNS cannot resolve `github.com`;
- Corepack cannot reach `registry.npmjs.org` to obtain pnpm;
- the public branch archive cannot be obtained through the shell network path.

The final C4 matrix therefore still needs a repository execution environment
with the existing dependencies/toolchain available.

## Git/attribution audit

The branch commit listing was searched for prohibited attribution forms:

- `Co-Authored-By` — no matches
- `Generated with` — no matches
- `Claude` — no matches

`Codex` does appear in an older documentation commit body that explains why
large delegated CLI transcripts must not be committed. That is descriptive
repository documentation, **not** contributor/co-author attribution.

The audited `main...branch` changed-file list contains no environment file and
no delegated `*-run.log` transcript. This is a diff-level audit; the final local
working-tree/security scan remains part of C4/C6.

## Runtime work still blocked

### C3 — production data repair

The existing Efesto 876 Projects app assignment still needs a deliberate dry-run
review and repair/backfill. This session has no production database credentials
or internal API key and therefore did not mutate production.

### C4 — final command matrix

Still required:

- Console typecheck/lint/test
- Projects **app** typecheck/lint/test (`@876/projects-app`)
- Projects UI typecheck/test
- UI typecheck/test
- API typecheck/lint/test
- Core typecheck/test
- Editor typecheck/test
- app-structure check
- shared transpile check
- API boundaries confirmation against the known 18-cycle baseline
- outstanding production builds using the exact app workspace names recorded in
  `todo.md`

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

Do not open the integration PR to `main` yet. Per the plan and repository git
rules, C3-C5 are acceptance gates. Once they are genuinely green, update the
plan/TODO to completed, write the final acceptance report, re-check divergence
and attribution/security state, and open the single integration PR.
