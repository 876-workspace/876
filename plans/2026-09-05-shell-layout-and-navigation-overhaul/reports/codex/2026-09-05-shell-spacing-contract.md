# Shell spacing contract

## Change summary

`@876/ui` now owns `--876-shell-gutter`. Its resolved values intentionally
reuse Tailwind's existing spacing scale:

| Viewport                    | Token value        | Resolved length |
| --------------------------- | ------------------ | --------------- |
| below `40rem`               | `var(--spacing-4)` | `1rem` / 16px   |
| `40rem` through `63.999rem` | `var(--spacing-6)` | `1.5rem` / 24px |
| `64rem` and above           | `var(--spacing-8)` | `2rem` / 32px   |

The Page horizontal padding, ListDetailShell open-column gap, shell scroll
padding, and each floating sidebar's horizontal inset reference that token.
The list/detail shell also reclaims the Page's left gutter, so an open list
starts one shell gutter from the floating sidebar rather than receiving the
sidebar gutter plus a second Page gutter. The right Page gutter remains intact.

## Files changed

- `packages/ui/src/876.css` — defines the responsive shared gutter token.
- `packages/ui/src/components/app-shell.tsx` — makes AppShell and AppShellMain
  consume the shared horizontal rhythm for scroll positioning.
- `packages/ui/src/components/page.tsx` — replaces the independent page
  horizontal literals with the token.
- `packages/ui/src/components/list-detail-shell.tsx` — replaces `gap-x-4`
  with the token and removes the compounded left Page gutter for the split
  shell.
- `packages/ui/src/components/sidebar.tsx` — makes the shared floating
  Sidebar's inset and collapsed-width calculation account for the same token.
- `packages/ui/src/components/list-detail-shell.test.tsx` — adds the Page /
  list-detail token equality assertion.
- `apps/console/src/components/shell/sidebar.tsx` — replaces the asymmetric
  rail and panel insets with the shared symmetric gutter. Expanded entry rows
  are now `h-8.5`, matching the rail's `size-8.5`; root and drill-down rails
  already shared their `gap-1` and divider `my-0.5` rhythm.
- `apps/console/src/components/shell/sidebar.test.tsx` — adds rail and panel
  symmetric-inset regression cases.
- `apps/projects/src/components/shell/sidebar.tsx` and
  `apps/crm/src/components/shell/sidebar.tsx` — replace their identical
  asymmetric floating-sidebars with the shared symmetric gutter.
- `apps/billing/src/components/shell/sidebar.tsx`,
  `apps/invoice/src/components/shell/sidebar.tsx`, and
  `apps/couriers/src/components/shell/sidebar.tsx` — select the shared
  floating Sidebar variant so it receives the shared token-controlled card
  inset.

## Sidebar drift found

- Projects and CRM had an older, static floating rail matching Console's old
  `pr-1 pl-3` asymmetry, but no contextual/panel expansion.
- Billing, Invoice, and Couriers used the generic full-height `Sidebar` rather
  than Console's custom floating context card. They also differed in header,
  group, and item presentation. Their shared primitive now supplies the
  floating-card geometry; their product-specific navigation content remains
  unchanged.

## Tests added

Three `it()` cases were added:

1. Page gutter equals the ListDetailShell's open gap token.
2. Console rail inset is symmetric.
3. Console expanded-panel inset is symmetric while its width changes.

Focused results:

```text
pnpm --filter @876/ui exec vitest run src/components/list-detail-shell.test.tsx
Test Files  1 passed (1)
Tests       20 passed (20)

pnpm --filter @876/console exec vitest run src/components/shell/sidebar.test.tsx
Test Files  1 passed (1)
Tests       30 passed (30)
```

## Verification

```text
pnpm --filter @876/ui typecheck
$ tsc --noEmit

pnpm --filter @876/ui test
Test Files  26 passed (26)
Tests       237 passed (237)
Duration    20.86s

pnpm --filter @876/console typecheck && pnpm --filter @876/console lint
$ tsc --noEmit
$ eslint

pnpm --filter @876/projects typecheck
$ tsc --noEmit

pnpm --filter @876/projects test
Test Files  10 passed (10)
Tests       61 passed (61)
Duration    1.40s

node scripts/check-app-structure.mjs
app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm, projects)
```

The exact package-script Console suite was started in the foreground. It
completed with 167 passed files / 1,631 passed tests and one unrelated failure:

```text
src/features/billing/components/__tests__/subscription-billing-summary.advanced.test.tsx
SubscriptionBillingSummary / Frontend Component / advanced
produces stable snapshot for full billing summary (golden master)

Error: The snapshot state for '...subscription-billing-summary.advanced.test.tsx' is not found.
Did you call 'SnapshotClient.setup()'?
```

The failure precedes this spacing work and is outside every changed file. The
focused Sidebar suite, including the new cases, passes. No browser session was
available to manually inspect the three named routes. No data fetching,
Suspense boundary, or page business behavior changed.

The only spacing change beyond the three named sources is normalizing Console's
expanded navigation row height from its implicit 32px (`py-1.5` plus line box)
to the rail's explicit 34px (`h-8.5`). This is required for the requested
identical item rhythm across root rail, drill-down rail, and expanded panel.

## Follow-up

### Corrected box models

The in-flow Console, Projects, and CRM asides now own only `pl` and `Page`
owns both content insets. `ListDetailShell` has no negative margin.

| Breakpoint          | Gutter | Window → card | Card → content | Content → right edge |
| ------------------- | -----: | ------------: | -------------: | -------------------: |
| below `40rem`       |   16px |          16px |           16px |                 16px |
| `40rem`–`63.999rem` |   24px |          24px |           24px |                 24px |
| `64rem` and above   |   32px |          32px |           32px |                 32px |

The shared floating Sidebar remains fixed. Its card is horizontally inset by
one gutter; its flow spacer is `sidebar-width - gutter`; the main `Page` then
adds its left gutter. Thus the card ends at `sidebar-width - gutter` and the
content begins at `sidebar-width`. The same relationship is retained while
collapsed: the spacer is `sidebar-width-icon + gutter + 2px`, matching the
fixed card's `sidebar-width-icon + 2 × gutter + 2px` outer width.

| Breakpoint          | Gutter | Window → card | Card → content | Content → right edge |
| ------------------- | -----: | ------------: | -------------: | -------------------: |
| below `40rem`       |   16px |          16px |           16px |                 16px |
| `40rem`–`63.999rem` |   24px |          24px |           24px |                 24px |
| `64rem` and above   |   32px |          32px |           32px |                 32px |

Vertical padding for the floating/inset primitive is restored to `py-2`
(8px); only its horizontal inset uses the gutter token.

### Route-wrapper audit

The stated `Page` claim is not literally true. Several main-column Console
detail layouts use the older but geometrically equivalent
`px-4 sm:px-6 lg:px-8` wrapper instead, including `users/[username]`,
`apps/[slug]`, `orgs/[slug]`, `features/[id]`, and `widgets/[widgetSlug]`.
There are also redirect-only routes such as `dashboard` and
`widgets/notes/[...path]`. The legacy wrappers still resolve to 16/24/32px,
so the corrected in-flow spacing contract holds; they should be migrated to
`Page` separately rather than as part of this spacing correction.

### Tests and verification

Three new `it()` cases were added; two existing spacing cases were rewritten
to resolve the plain-Page and ListDetailShell gap relationships. The coverage
now includes the fixed floating calculation (expanded and collapsed), its
unchanged `py-2`, and a ListDetailShell without a Page parent.

```text
pnpm --filter @876/ui typecheck
$ tsc --noEmit

pnpm --filter @876/ui exec vitest run src/components/sidebar.test.tsx src/components/list-detail-shell.test.tsx --reporter=dot
Test Files  2 passed (2)
Tests       23 passed (23)

pnpm --filter @876/console exec vitest run src/components/shell/sidebar.test.tsx --reporter=dot
Test Files  1 passed (1)
Tests       30 passed (30)

pnpm --filter @876/projects typecheck && pnpm --filter @876/projects test
Test Files  10 passed (10)
Tests       61 passed (61)

pnpm --filter @876/billing typecheck && pnpm --filter @876/billing test
Test Files  19 passed (19)
Tests       213 passed (213)

node scripts/check-app-structure.mjs
app-structure: OK (console, billing, couriers, 876, enterprise, invoice, crm, projects)
```

The full `@876/ui` suite, full Console command chain, Couriers-App command
chain, and corrected Invoice-App command exceeded the environment's 30-second
foreground command return limit before reporting a result. The requested
literal `pnpm --filter @876/invoice ...` commands cannot run because there is
no workspace with that name; the workspace is `@876/invoice-app`, whose
typecheck likewise exceeded that limit. No browser session was available for
manual visual verification.
