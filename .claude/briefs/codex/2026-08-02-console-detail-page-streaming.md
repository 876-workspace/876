# Brief — Console detail pages: stream sections behind Suspense

## Why

Phase 2 fixed the Console **list** pages. The detail pages have the same defect
and it is worse there, because a detail page typically awaits several
independent things — the entity itself, plus tabs/panels/counts — and a single
slow one holds the whole screen. Clicking a user in the list still leaves the
list on screen until every panel's data has resolved.

This phase applies the same shape to detail routes: entity header paints first,
each independent panel streams into its own boundary.

Reference (read before starting):

- `node_modules/next/dist/docs/01-app/02-guides/streaming.md`
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`

**Do NOT enable `cacheComponents` or use `unstable_instant` / `use cache`.**

## Read the Phase 2 work first

The 13 list routes on this branch already establish the conventions: where the
skeleton-column constants live, how `loading.tsx` mirrors the chrome, how the
toolbar's searchParams-dependent bits sit in their own small boundary. **Match
those conventions exactly** — do not invent a second style. Start by reading:

- `apps/console/src/app/(app)/users/page.tsx` and `users/loading.tsx`
- `apps/console/src/app/(app)/orgs/page.tsx` and `orgs/loading.tsx`

## Scope — files you may touch

Only these route directories under `apps/console/src/app/(app)/`:

| #   | Route dir                                                      |
| --- | -------------------------------------------------------------- |
| 1   | `users/[username]/` (the overview `page.tsx` + its `_data.ts`) |
| 2   | `users/[username]/security/`                                   |
| 3   | `users/[username]/addresses/`                                  |
| 4   | `users/[username]/contacts/`                                   |
| 5   | `users/[username]/audit/`                                      |
| 6   | `users/[username]/org/`                                        |
| 7   | `orgs/[slug]/` (overview `page.tsx`)                           |
| 8   | `orgs/[slug]/activity/`                                        |
| 9   | `orgs/[slug]/billing/`                                         |
| 10  | `apps/[slug]/` (overview `page.tsx`)                           |
| 11  | `apps/[slug]/settings/`                                        |
| 12  | `apps/[slug]/plans/[planSlug]/`                                |
| 13  | `features/[id]/`                                               |

You may **add** `loading.tsx` and files under each route's own `_components/`.
You may **not** touch `packages/`, any other app, `apps/api`, or any route
outside the table — in particular do not re-edit the Phase 2 list routes.

**Layouts are in scope only for `users/[username]/layout.tsx`,
`orgs/[slug]/layout.tsx` and `apps/[slug]/layout.tsx`** — see the layout rule
below. Do not touch `(app)/layout.tsx`.

## The pattern

1. **The page function must not `await` anything.** Pass `params` down
   un-awaited.
2. **One boundary per independent fetch.** If a detail page awaits the entity
   and then three unrelated panels, that is four boundaries, not one — unless a
   panel genuinely needs the entity's id, in which case nest it inside the
   entity's boundary rather than serialising it at the top.
3. **Parallelise what is already independent.** If the existing code awaits A
   then B and B does not use A, they must not remain sequential. Either put them
   in separate Suspense children (preferred — they stream independently) or
   `Promise.all` them inside one child. Do not leave a sequential waterfall in
   place.
4. **`notFound()` must still run before anything streams.** A detail page that
   currently calls `notFound()` when the entity is missing must keep doing so
   _before_ any other boundary can flush, otherwise a 404 renders as a shell
   with panels. Put the entity fetch + `notFound()` in the outermost data
   component and nest the panels inside it. Do not hoist panels above it.
   See the "Status Codes" section of the streaming doc.
5. **Preserve behavior exactly** — same calls, same params, same guards, same
   props into existing components.

### The layout caveat — this is the important one

Per the `loading.js` doc: _"If the layout accesses uncached or runtime data,
`loading.js` will not show a fallback for it — navigation blocks until the
layout finishes rendering."_

`users/[username]/layout.tsx`, `orgs/[slug]/layout.tsx` and
`apps/[slug]/layout.tsx` each fetch data to build their tab strip (e.g.
`orgs/[slug]/layout.tsx` awaits a member count just to label a tab
`Members (12)`). **That await blocks the entire detail route's `loading.tsx`
from ever showing**, which defeats this whole phase for those routes.

For each of those three layouts:

- Move any data fetch that only decorates a tab label into its own `<Suspense>`
  inside the layout, with a fallback that renders the tab **without** the
  decoration (e.g. `Members` with a small `<Skeleton>` where the count goes) —
  never a fallback that omits the tab, which would make the nav jump.
- If the layout fetches the entity purely to render a name/heading, wrap that in
  its own boundary too.
- If a layout fetch is a genuine **guard** (redirect/404 on missing entity),
  leave it blocking — correctness wins over the shell. Say so in your report.

### `loading.tsx`

One per route in the table, mirroring that route's chrome with `Skeleton`
blocks in the same shape and height, so nothing shifts on swap. Use
`DataTableSkeleton` (`@876/ui/data-table-skeleton`) where the route's body is a
table; plain `Skeleton` blocks shaped like the real panels otherwise. Include
the real `PageBreadcrumb` where the page has one and its href needs no awaited
data.

## Rules from the repo you must follow

- `.claude/rules/app-structure.md`, `.claude/rules/app-layout.md`,
  `.claude/rules/code-style.md`.
- **No server actions.** Do not introduce any.
- Do not add `export const dynamic` / `revalidate`. A later phase audits that.
- Do not modify `packages/ui/src/components/data-table-skeleton.tsx`.

## Verification — all must pass before you report done

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
npx prettier --check "apps/console/src/app/(app)/**/*.tsx"
```

## Do not

- Do not commit, branch, stash, or run any `git` write command.
- Do not enable `cacheComponents`, use `use cache`, or export `unstable_instant`.
- Do not re-edit Phase 2's list routes or invent a second convention.

## Report back

Per route: boundaries added, any waterfall you collapsed, and — explicitly —
which of the three layouts you unblocked and which fetches you had to leave
blocking because they are guards.
