## Shared rules for this run (read first)

- Repo: /root/projects/876. The working tree is SHARED with other agents running
  at the same time on other file scopes. NEVER run `git checkout`, `git stash`,
  `git reset`, `git clean`, `git commit`, `git add`, or create branches/worktrees.
  Do not commit. Do not write run logs anywhere.
- Stay strictly inside YOUR file scope. A typecheck/test failure in a file outside
  your scope belongs to another agent — ignore it, do not "fix" it.
- Read before coding: `.claude/rules/ai-code-quality.md`, `app-structure.md`,
  `app-layout.md`, `data-loading.md`, `error-handling.md`, `naming.md`,
  `testing.md`, `code-style.md`, plus any rule your brief names.
- Reuse-first: search for the existing owner (packages/ui, @876/billing-ui,
  Console/Invoice/Billing implementations) before writing anything new. Copy
  patterns, import shared components; never fork a shared component.
- UI copy: NO descriptive sub-heading paragraphs under page/section headings
  and no descriptive sentences in empty states. The user explicitly hates them.
  Remove any you encounter in files you touch.
- No green buttons. Add buttons are `variant="info"` labelled `Add`.
- No `eslint-disable`, `@ts-ignore`, `as any`. No server actions, no proxy.ts.
- Tests: every new behavior gets real tests (vitest). Couriers app tests run with
  `pnpm --filter @876/couriers-app exec vitest run <paths>`.
- Finish with a report at the path your brief names: files changed + why,
  decisions made, counted tests added, verification commands run with their
  actual results, and anything you could not do.
- Memory is tight (7 GB shared with a dev server): run ONE test/typecheck command at a time.
