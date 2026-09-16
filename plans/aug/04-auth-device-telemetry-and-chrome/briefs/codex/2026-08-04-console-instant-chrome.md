# Console — stop skeletoning page chrome; shimmer only the data

## Why

Same defect as the couriers pass (see
`.claude/briefs/codex/2026-08-04-couriers-instant-chrome.md`), and Console has
more of it. On a client navigation, page chrome — `ResourceToolbar` title,
`StatusFilterHeading`, Add button, `···` dropdown, `PageBreadcrumb` — is
replaced by grey `<Skeleton>` bars, then swapped for the real thing a beat
later. None of that chrome depends on I/O; it was skeletoned only because the
components rendering it `await params` / `await searchParams`, promises that
carry **no I/O**.

Next's own guidance (`node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md`,
"Iterate on loading states"): _"The best loading states keep as much real,
cached content visible as possible and only show fallbacks where data is
actually in flight."_

The platform rule now lives in `CLAUDE.md` → **"Loading States & Suspense
Placement"**. Read it before starting; it is the acceptance criterion.

## Target behaviour

On both a hard load and a client navigation into any Console page:

| Element                                         | While data is in flight |
| ----------------------------------------------- | ----------------------- |
| `ResourceToolbar` title + `StatusFilterHeading` | **real, interactive**   |
| Add button, `···` dropdown, `PageBreadcrumb`    | **real, interactive**   |
| Data table `<thead>` column labels              | **real text**           |
| Data table body rows                            | shimmering skeleton     |
| Detail-page entity header                       | real where derivable    |

No grey bar ever appears where a toolbar or section heading goes.

## Scope — `apps/console` ONLY

Do not touch `apps/couriers`, `apps/876`, `apps/enterprise`, `apps/billing`,
`apps/api`, or `packages/**`. `DataTableSkeleton` already renders real column
headers, so no shared-package change should be needed — if you think one is,
**stop and explain it in your summary instead of making it**.

### Priority 1 — tables falling back to a bare skeleton (worst offenders)

These replace an entire table, headers included, with one grey rectangle. Give
each a `*-skeleton-columns.ts` matching the loaded table's real column labels
exactly and in order (read the table component; do not guess), then use
`<DataTableSkeleton columns={…} />`:

- `src/app/(app)/users/[username]/contacts/page.tsx` +
  `_components/contacts-page-skeleton.tsx` + `loading.tsx`
- `src/app/(app)/users/[username]/addresses/page.tsx` +
  `_components/addresses-page-skeleton.tsx` + `loading.tsx`
- `src/app/(app)/orgs/[slug]/activity/page.tsx` + `loading.tsx`

Note both `*-page-skeleton.tsx` files carry a comment justifying a whole-route
skeleton "so the toolbar placeholder isn't dropped". That reasoning is what this
work reverses: the toolbar should be **real**, not a placeholder. Rewrite those
components (or delete them in favour of a real shell) accordingly.

### Priority 2 — chrome behind Suspense

- `src/app/(app)/orgs/page.tsx` — `titleFilter` wrapped in
  `<Suspense fallback={<Skeleton className="h-7 w-48" />}>`; the toolbar title
  itself flashes.
- `src/app/(app)/apps/page.tsx` — same pattern.
- `src/app/(app)/orgs/[slug]/members/page.tsx` — `MembersChromeSkeleton`.
- `src/app/(app)/orgs/[slug]/billing/accounts/page.tsx` — `AccountsChromeSkeleton`.
- `src/app/(app)/orgs/[slug]/billing/customers/page.tsx` — `CustomersChromeSkeleton`.
- `src/app/(app)/orgs/[slug]/billing/subscriptions/page.tsx` — `SubscriptionsChromeSkeleton`.

Every `*ChromeSkeleton` is the anti-pattern by name: it skeletons the chrome.
The chrome must render for real; only the table body is a fallback.

### Priority 3 — remaining pages and every `loading.tsx`

Sweep all 26 `loading.tsx` files under `src/app/(app)/` plus the pages under
`apps/[slug]/**`, `features/[id]/**`, `settings/users/**`, and `audit-log/`.
Apply the same rule. Pages whose fallback is a stack of bare `<Skeleton>`
blocks (`AppOverviewSkeleton`, `PlanSkeleton`, `BillingSkeleton`,
`FeatureSkeleton`, `SettingsSkeleton`) keep their heading/breadcrumb real and
skeleton only the body panels.

## The refactor, precisely

### 1. Await route promises at the top of the page

```tsx
export default async function OrganizationsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const selectedStatus = status === 'all' || !isOrgStatus(status) ? 'all' : status

  return (
    <Page>
      <ResourceToolbar
        title="Organizations"
        titleFilter={
          <StatusFilterHeading
            label="Organizations"
            value={selectedStatus}
            options={ORG_STATUS_OPTIONS}
          />
        }
        …
      />
      <Suspense fallback={<DataTableSkeleton columns={ORGS_SKELETON_COLUMNS} />}>
        <OrganizationsTableData searchParams={searchParams} />
      </Suspense>
    </Page>
  )
}
```

Delete the now-dead `*StatusFilter` / `*Chrome` async sub-components and the
`<Suspense>` boundaries that wrapped them. Keep passing the **promise** into the
data component, which already awaits it.

### 2. `loading.tsx` renders the real chrome, not a bar

`loading.tsx` receives no props, so make it a **client** component and read
`useParams()` from `next/navigation` (it does not suspend) for any route that
needs `[slug]` / `[username]` / `[id]` in an href.

**Do NOT call `useSearchParams()` in a `loading.tsx`** — it suspends during
prerender and a route-level fallback has no boundary above it. Default a status
filter to `"all"`.

Extract the shared literals — status option arrays, `dropdownActions` arrays,
skeleton column lists — into the route's `_components/` (renders) or `_lib/`
(plain data) per `.claude/rules/app-structure.md`, so the page and its
`loading.tsx` import the same constants instead of each maintaining a copy. A
shared shell component taking the route param + `children` is also fine — use
judgement, but the two files must not hand-maintain duplicate toolbars.

### 3. Do not remove `loading.tsx` files

They are the only instant feedback during the server round-trip on a client
navigation. Fix them; don't delete them.

## Constraints

- Follow `.claude/rules/app-layout.md` (toolbar anatomy, `876-page-title`,
  bare-verb button labels, breadcrumb placement, table cell hierarchy),
  `.claude/rules/app-structure.md`, and `.claude/rules/code-style.md`.
- No behaviour change to data fetching, `requireConsolePermission` guards,
  status-filter semantics, or the `status=all → undefined` threading into
  `.list()` / `.search()`.
- Do not rename routes or exported components consumed elsewhere.
- Do not commit. Do not create branches. Leave the work in the working tree.
- Update any `_components/*.test.tsx` whose props changed. Do not weaken an
  assertion to make a test pass.

## Verification — run all of these, in the foreground, and report exit codes

```bash
cd /workspaces/876
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
pnpm prettier --check "apps/console/**/*.{ts,tsx}"
```

All four must pass. If one fails for a reason unrelated to your change, say so
explicitly with the exact error rather than working around it.

## Report back

1. Every file changed, one line each on what changed.
2. Every new `*-skeleton-columns.ts` and the table you read to derive it.
3. Any page where "real chrome immediately" could not be met, and why.
4. Whether you needed anything from `packages/ui` (you must not have changed it).
5. Exit code of each verification command.
