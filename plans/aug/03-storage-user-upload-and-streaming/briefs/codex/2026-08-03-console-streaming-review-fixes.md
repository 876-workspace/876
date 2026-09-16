# Brief — Fix three review findings on the console streaming PR

Branch: `feat/console-list-streaming` (already checked out). These are
follow-ups to the Suspense restructure already on this branch, raised by the
automated reviewer on PR #159. All three are legitimate.

## Finding 1 — chrome is trapped inside the slow data boundary

**This is the important one.** The whole point of the change was that page
chrome paints immediately. On these four routes it does not: the single
`<Suspense>` wraps a data component that renders the breadcrumb and heading
_as well as_ the table, so while the list request is in flight the user sees
`loading.tsx`'s chrome, then that chrome **disappears** and is replaced by only
a table skeleton, then comes back. A visible layout shift, and the opposite of
the intent.

Affected:

- `apps/console/src/app/(app)/orgs/[slug]/billing/accounts/page.tsx`
- `apps/console/src/app/(app)/orgs/[slug]/billing/customers/page.tsx`
- `apps/console/src/app/(app)/orgs/[slug]/billing/subscriptions/page.tsx`
- `apps/console/src/app/(app)/orgs/[slug]/members/page.tsx`

### The fix: two tiers

Split into a **fast shell boundary** and a **slow data boundary**:

```tsx
export default function OrganizationBillingAccountsPage({ params, searchParams }: Props) {
  return (
    <div className="space-y-5">
      <Suspense fallback={<AccountsChromeSkeleton />}>
        <BillingAccountsShell params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  )
}

// Tier 1 — resolves params + the org, renders chrome, then opens the slow boundary.
async function BillingAccountsShell({ params, searchParams }: Props) {
  const { slug } = await params
  const org = await resolveOrg(slug)
  if (!org) notFound()

  return (
    <>
      <div>
        <PageBreadcrumb href={`/orgs/${slug}/billing`} label="Billing" />
        {/* …existing heading markup, unchanged… */}
      </div>

      <Suspense fallback={<DataTableSkeleton columns={ACCOUNTS_SKELETON_COLUMNS} />}>
        <BillingAccountsData org={org} slug={slug} searchParams={searchParams} />
      </Suspense>
    </>
  )
}

// Tier 2 — only the slow list.
async function BillingAccountsData({ org, slug, searchParams }: …) {
  const resolvedSearchParams = await searchParams
  const accounts = await resolveOrgBillingAccounts(org.id)
  …
}
```

Why tier 1 is cheap: `resolveOrg`, `resolveApp`, `resolveProduct` and the
`resolveOrg*` loaders in `orgs/[slug]/_data.ts` and `apps/[slug]/_data.ts` are
all wrapped in React `cache()`, and the segment layout already calls them — so
in the common case tier 1 is a cache hit that settles immediately while the
list request is still in flight. **Verify this per file before relying on it**;
if a page's tier-1 call is genuinely uncached, say so in your report rather
than pretending it is free.

Pass the already-resolved entity **down as a prop** to tier 2 rather than
re-resolving it there.

## Finding 2 — the product-kind gate runs after the shell commits

`apps/[slug]/plans/page.tsx` and `apps/[slug]/subscribers/page.tsx` call
`notFound()` for `app_kind !== 'product'` _inside_ the data component, so a
non-product app streams a Plans heading and skeleton before 404-ing.

Apply the same two-tier split: resolve the app and run the
`!app || app.app_kind !== 'product'` gate in tier 1, before any chrome or the
slow boundary is rendered.

**Scope note — read this before "fixing" the status code.** The reviewer framed
this as a 200-instead-of-404 regression. That framing is only partly right:
these routes have a `loading.tsx`, and per
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md`
the response body starts streaming as soon as a Suspense fallback renders — so
the 200 status is **inherent to having `loading.tsx` at all**, not to where
`notFound()` sits. Next.js emits `<meta name="robots" content="noindex">` for a
streamed 404, and this is an auth-gated internal console, so the status code is
acceptable. **Do not remove `loading.tsx`, and do not restructure the page to
block rendering just to recover a 404 status.** Fix only the _ordering_, so the
not-found result is reached before the slow fetch instead of after it.

## Finding 3 — `loading.tsx` renders a breadcrumb pointing at the wrong place

`orgs/[slug]/billing/accounts/loading.tsx` and
`orgs/[slug]/billing/subscriptions/loading.tsx` (check the others too) render
`PageBreadcrumb` with `href="/orgs"`, while the resolved page links to
`/orgs/${slug}/billing`. Clicking it during a slow navigation dumps the user on
the organization list instead of the org they were looking at.

`loading.tsx` receives no `params`, so the correct href cannot be built there.
**Replace the breadcrumb with a non-interactive placeholder** of the same size,
e.g. `<Skeleton className="h-7 w-24" />`, so nothing exposes a wrong link and
the layout still does not shift. Do not guess the href, and do not drop the
element entirely (that would shift the layout).

Audit **every** `loading.tsx` added on this branch for the same class of bug:
any `href`, `Link`, or button target that cannot be derived without `params`
must be a placeholder, not a wrong value.

## Rules

- Preserve behavior otherwise: same calls, same params, same guards, same props
  into existing components.
- Do not add `export const dynamic` / `revalidate`.
- Do not enable `cacheComponents`, use `use cache`, or export `unstable_instant`.
- Do not modify `packages/`, `apps/couriers`, or `apps/api`.
- Do not commit, branch, stash, or run any `git` write command.
- `.claude/rules/app-structure.md` and `.claude/rules/app-layout.md` apply.

## Verification — all must pass

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
npx prettier --check "apps/console/src/app/(app)/**/*.tsx"
```

## Report back

Per finding: which files changed, and for Finding 1 confirm per file whether the
tier-1 resolver was genuinely `cache()`-backed or not.
