# Shell spacing contract

## Change summary

`@876/ui` owns `--876-shell-gutter`. The current implementation uses Tailwind
v4's real base spacing custom property (`--spacing`) and calculates the three
responsive lengths from it:

| Viewport                    | Token value                | Resolved length |
| --------------------------- | -------------------------- | --------------- |
| below `40rem`               | `calc(var(--spacing) * 4)` | `1rem` / 16px   |
| `40rem` through `63.999rem` | `calc(var(--spacing) * 6)` | `1.5rem` / 24px |
| `64rem` and above           | `calc(var(--spacing) * 8)` | `2rem` / 32px   |

An earlier draft of this report incorrectly documented the token as
`var(--spacing-4)`, `var(--spacing-6)`, and `var(--spacing-8)`. Those variables
do not exist in Tailwind v4. That invalid form was found during the integration
review and corrected in the code to the `calc(var(--spacing) * N)` expressions
shown above. `packages/ui/src/876-tokens.test.ts` now guards the token contract.

The Page horizontal padding, ListDetailShell open-column gap, shell scroll
padding, and floating/in-flow sidebar geometry reference the same shared rhythm.
The final browser-level route matrix is tracked separately in `todo.md` C5.

## Files changed

- `packages/ui/src/876.css` — defines the responsive shared gutter token using
  valid Tailwind v4 spacing expressions.
- `packages/ui/src/876-tokens.test.ts` — asserts the shared token definitions so
  an unresolved custom property cannot silently collapse all shell gutters.
- `packages/ui/src/components/app-shell.tsx` — makes AppShell and AppShellMain
  consume the shared horizontal rhythm for scroll positioning.
- `packages/ui/src/components/page.tsx` — replaces independent page horizontal
  literals with the token.
- `packages/ui/src/components/list-detail-shell.tsx` — aligns the open-column gap
  with the token and avoids a compounded left Page gutter.
- `packages/ui/src/components/sidebar.tsx` — makes the shared floating Sidebar's
  inset and collapsed-width calculation account for the same token.
- `apps/console/src/components/shell/sidebar.tsx` — replaces asymmetric rail and
  panel insets with the shared gutter and normalizes expanded row height.
- `apps/projects/src/components/shell/sidebar.tsx` and
  `apps/crm/src/components/shell/sidebar.tsx` — use the shared left gutter for
  their in-flow sidebars.
- `apps/billing/src/components/shell/sidebar.tsx`,
  `apps/invoice/src/components/shell/sidebar.tsx`, and
  `apps/couriers/src/components/shell/sidebar.tsx` — select the shared floating
  Sidebar variant so card geometry is token-controlled.

## Geometry contract

### In-flow sidebars

Console, Projects, and CRM sidebars own the left shell inset; `Page` owns the
content insets. `ListDetailShell` no longer uses a negative-margin reclaim.

| Breakpoint          | Gutter | Window → card | Card → content | Content → right edge |
| ------------------- | -----: | ------------: | -------------: | -------------------: |
| below `40rem`       |   16px |          16px |           16px |                 16px |
| `40rem`–`63.999rem` |   24px |          24px |           24px |                 24px |
| `64rem` and above   |   32px |          32px |           32px |                 32px |

### Shared floating Sidebar

The fixed floating Sidebar is horizontally inset by one gutter. Its flow spacer
accounts for the same gutter so the following Page starts exactly one gutter
away from the card. Vertical padding remains `py-2`; only horizontal geometry
uses `--876-shell-gutter`.

| Breakpoint          | Gutter | Window → card | Card → content | Content → right edge |
| ------------------- | -----: | ------------: | -------------: | -------------------: |
| below `40rem`       |   16px |          16px |           16px |                 16px |
| `40rem`–`63.999rem` |   24px |          24px |           24px |                 24px |
| `64rem` and above   |   32px |          32px |           32px |                 32px |

## Sidebar drift found during the phase

- Projects and CRM had an older static floating rail matching Console's previous
  `pr-1 pl-3` asymmetry.
- Billing, Invoice, and Couriers used the generic full-height Sidebar rather
  than the shared floating-card geometry.
- Console expanded items did not use the same explicit row height as the rail.

The implementation now shares the geometry while keeping product-specific
navigation content separate.

## Phase verification recorded before closeout

Focused checks recorded by the implementation phase included:

```text
pnpm --filter @876/ui exec vitest run src/components/list-detail-shell.test.tsx
Test Files  1 passed (1)
Tests       20 passed (20)

pnpm --filter @876/console exec vitest run src/components/shell/sidebar.test.tsx
Test Files  1 passed (1)
Tests       30 passed (30)

pnpm --filter @876/ui typecheck
$ tsc --noEmit

pnpm --filter @876/projects typecheck
$ tsc --noEmit

pnpm --filter @876/projects test
Test Files  10 passed (10)
Tests       61 passed (61)

node scripts/check-app-structure.mjs
app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm, projects)
```

A later spacing follow-up also recorded:

```text
pnpm --filter @876/ui exec vitest run src/components/sidebar.test.tsx src/components/list-detail-shell.test.tsx --reporter=dot
Test Files  2 passed (2)
Tests       23 passed (23)

pnpm --filter @876/console exec vitest run src/components/shell/sidebar.test.tsx --reporter=dot
Test Files  1 passed (1)
Tests       30 passed (30)

pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
Test Files  19 passed (19)
Tests       213 passed (213)
```

The phase also recorded one unrelated Console snapshot-harness failure in
`subscription-billing-summary.advanced.test.tsx` and command-window timeouts for
some full suites. Those historical results are not treated as the final merged
branch verification. The full closeout matrix is tracked in `todo.md` C4.

## Route-wrapper audit

Several Console detail routes still use the older but geometrically equivalent
`px-4 sm:px-6 lg:px-8` wrapper rather than `Page`. Because those literals resolve
to the same 16/24/32px values, they do not invalidate this spacing contract.
Migrating those wrappers to `Page` is separate cleanup and is not required for
this shell-overhaul closeout.

## Final acceptance still required

No browser session was available during the original spacing phase. Final visual
acceptance remains explicitly open in `todo.md` C5 for the named routes at
1280px, 1440px, and 1920px in both light and dark themes.
