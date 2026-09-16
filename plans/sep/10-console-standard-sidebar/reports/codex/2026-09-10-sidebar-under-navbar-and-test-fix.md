# Console sidebar under navbar and test fix

## Files changed

- `apps/console/src/test/setup.ts` — adds the repository-standard jsdom
  `matchMedia` stub so `SidebarProvider` can mount in Console tests.
- `apps/console/src/components/shell/shell.tsx` — moves the full-width topbar
  above the desktop sidebar/content row and places the desktop Console identity
  beside `SidebarTrigger`.
- `apps/console/src/components/shell/sidebar.tsx` — offsets the fixed desktop
  sidebar below the `h-14` topbar, removes the duplicate root identity, and
  avoids an empty root sidebar header when there are no top slots.
- `apps/console/src/components/shell/sidebar.test.tsx` — asserts the header
  offset and absence of the duplicate root identity.
- `apps/console/src/components/shell/shell.test.tsx` — asserts the desktop
  identity is in the header and the sidebar follows it in the shell layout.
- `apps/console/src/components/shell/README.md` — documents the header-above
  geometry and identity ownership.

## Decisions

No shared UI primitive changed. The existing `Sidebar` `className` hook applies
Console's `top-14 h-[calc(100svh-3.5rem)]` offset to its fixed container, so
the default `@876/ui` behavior for other apps is unchanged. Sidebar width,
collapse state, cookie persistence, mobile sheet navigation, and contextual
back/Escape behavior remain owned by the existing components.

## Tests changed

- Added `it()` cases: 1.
- Changed existing `it()` cases: 2.
- Total touched `it()` cases: 3.

## Verification

All requested commands passed:

- `pnpm --filter @876/console exec vitest run src/components/shell` — 14 test
  files, 160 tests passed.
- `pnpm --filter @876/ui exec vitest run` — passed.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --filter @876/console typecheck`
  — passed.
- `pnpm --filter @876/ui typecheck` — passed.
- `pnpm --filter @876/console lint` — passed.

Nothing remains unverified.

## Orchestrator note

Task 2 (sidebar under the navbar) was reverted at the user's request after this run; the Console shell keeps the full-height docked sidebar from the GPT web pass. Only Task 1 (the `matchMedia` stub in `apps/console/src/test/setup.ts`) landed. Re-verified by the orchestrator: Console 177 files / 1713 tests pass, typecheck and lint clean.
