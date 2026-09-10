# Codex brief: Console sidebar under the navbar + sidebar test fix

Branch: `feature/console-standard-sidebar` (already checked out). Do not commit,
branch, push, or open a PR — the orchestrator does that.

Read first: `.claude/rules/ai-code-quality.md`, `.claude/rules/app-structure.md`,
`.claude/rules/testing.md`, `.claude/rules/code-style.md`,
`apps/console/src/components/shell/README.md`.

## Task 1 — fix the failing Console sidebar suite (defect found in review)

`pnpm --filter @876/console exec vitest run src/components/shell/sidebar.test.tsx`
fails all 27 cases with `TypeError: window.matchMedia is not a function` from
`packages/ui/src/hooks/use-mobile.ts` (the standard `SidebarProvider` now mounts).
Other apps already stub this in their setup files — see
`apps/projects/src/test/setup.ts`, `apps/crm/src/test/setup.ts`,
`packages/ui/src/test/setup.ts`. Add the equivalent stub to
`apps/console/src/test/setup.ts` (match the existing pattern; do not invent a new
one). Then make every case in that file pass, fixing real assertion failures
honestly — never by weakening production code or deleting tests.

## Task 2 — mount the Console sidebar under the navbar (user request)

Current: `apps/console/src/components/shell/shell.tsx` renders the sidebar as a
full-height left column and the topbar (`AppShellHeader`) only spans the content
column. Required: the **topbar spans the full viewport width at the top**, and the
docked sidebar (`variant="sidebar"`, `collapsible="icon"`) sits **below** it,
filling the remaining height, beside the main content + widget rail.
(Google Cloud Console / Azure portal layout.)

Requirements:
- The Console logo/identity moves into the topbar's left edge on desktop (next to
  the `SidebarTrigger`), since the sidebar no longer owns the top-left corner.
  Remove the duplicate root identity from the sidebar header if it now
  duplicates the topbar; update the tests that assert it accordingly.
- The standard `@876/ui/sidebar` uses `fixed inset-y-0 h-svh`. It must be offset
  by the header height (`h-14`) so it does not render underneath the topbar,
  and its expanded/icon widths and collapse animation must still work.
- **Do not change the default behaviour of `@876/ui` for other apps** (couriers,
  billing, invoice, crm, projects all use `AppShell`). If a primitive change is
  needed, make it opt-in (a prop or a composable className hook), not a changed
  default. Prefer the smallest change; reuse existing primitives. No forked copy
  of the sidebar in Console.
- Mobile unchanged (sheet nav via `mobileNav`, desktop sidebar hidden).
- Keep the `sidebar_state` cookie persistence, contextual navigation, and
  Escape/back behaviour exactly as they are.
- Update `apps/console/src/components/shell/README.md` to describe the new
  geometry (short, factual).
- Add/adjust tests: shell/sidebar tests asserting the header-above layout (e.g.
  the sidebar region is rendered after/below the header, the logo is in the
  header), and, if you add an opt-in to `@876/ui`, a test in `packages/ui`
  proving both the default and opt-in paths.

## Constraints
- No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as any`.
- No run logs or transcripts anywhere.
- Scope: `apps/console/src/components/shell/**`, `apps/console/src/test/setup.ts`,
  and only if necessary `packages/ui/src/components/{app-shell,sidebar}.tsx` + tests.

## Verification you must run and report
```bash
pnpm --filter @876/console exec vitest run src/components/shell
pnpm --filter @876/ui exec vitest run
NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter @876/console typecheck
pnpm --filter @876/ui typecheck
pnpm --filter @876/console lint
```

## Report
Write `plans/2026-09-10-console-standard-sidebar/reports/codex/2026-09-10-sidebar-under-navbar-and-test-fix.md`:
files changed with reasons, decisions made, counted `it()` cases added/changed,
verification output summary, anything not verified.
