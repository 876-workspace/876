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

The live closeout tracker was updated in `fda5477a` after these changes.

## Branch state at this review

GitHub comparison against `main` reported:

- status: `ahead`
- ahead by: **29 commits**
- behind by: **0 commits**
- merge base: `1419aaee85264ed4c278d952af6e4687383df157`

This must be re-checked immediately before the final PR because `main` may move.

## Verification infrastructure state

GitHub reports **no Actions runs** for this branch and no commit-status entries
on the closeout head. Therefore the absence of red checks is not a green CI
signal.

The available execution container could not resolve `github.com`, so it could
not clone the repository and run pnpm commands locally. The final C4 matrix must
run in a repository execution environment before merge.

## Git/attribution audit

The branch commit listing was searched for prohibited attribution forms:

- `Co-Authored-By` — no matches
- `Generated with` — no matches
- `Claude` — no matches

`Codex` does appear in an older documentation commit body that explains why
large delegated CLI transcripts must not be committed. That is descriptive
repository documentation, **not** contributor/co-author attribution.

The current `main...branch` changed-file list contains no environment file and
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
- Projects typecheck/lint/test
- Projects UI typecheck/test
- UI typecheck/test
- API typecheck/lint/test
- Core typecheck/test
- Editor typecheck/test
- app-structure check
- shared transpile/Tailwind-source check
- API boundaries confirmation against the known 18-cycle baseline
- outstanding production builds

### C5 — browser acceptance

Still requires an authenticated Console/Projects browser session and the full
1280/1440/1920 light/dark matrix, including the real Efesto comment workflow.

### PROJ-10

No `PROJ-10` exists in this repository's GitHub Issues search. It appears to be
an external/product tracker key. Do not manufacture a duplicate GitHub issue;
resolve it in the tracker that actually owns it.

## Final PR gate

Do not open the integration PR to `main` yet. Per the plan and repository git
rules, C3-C5 are acceptance gates. Once they are genuinely green, update the
plan/TODO to completed, write the final acceptance report, re-check divergence
and attribution/security state, and open the single integration PR.
