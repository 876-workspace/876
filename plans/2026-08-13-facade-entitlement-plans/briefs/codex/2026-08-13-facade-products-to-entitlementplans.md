# Brief: rename the Core `$876.products` facade noun to `$876.entitlementPlans` (app call sites only)

## Context

The unified `$876` facade had a namespace collision: `$876.products` meant the
**Core per-app entitlement-plan/price catalog** on the Enterprise/platform and
Console surfaces, but the **Billing commercial catalog** on the Billing surface.
The facade has already been fixed in `packages/client` (do NOT touch it): the
Core catalog is now `$876.entitlementPlans` (with `.admin`), and `$876.products`
is Billing-only.

Your job is the **mechanical call-site sweep in the two consuming apps** so they
compile against the renamed facade. This is a pure identifier rename — no logic,
no behavior, no signatures change.

## Exact change

Rename the facade **accessor** `products` → `entitlementPlans` at these call
sites ONLY. The methods, arguments, and returned types are unchanged.

### Console (9 files) — `$876.products.admin` → `$876.entitlementPlans.admin`

Replace every occurrence of the exact substring `$876.products.admin` with
`$876.entitlementPlans.admin` in:

1. `apps/console/src/app/(app)/orgs/[slug]/billing/subscriptions/(list)/page.tsx`
2. `apps/console/src/app/(app)/orgs/[slug]/billing/subscriptions/new/page.tsx`
3. `apps/console/src/app/(app)/apps/[slug]/_data.ts`
4. `apps/console/src/app/(app)/apps/[slug]/plans/(list)/page.tsx`
5. `apps/console/src/app/(app)/apps/[slug]/plans/[planSlug]/subscribers/page.tsx`
6. `apps/console/src/app/(app)/apps/[slug]/plans/[planSlug]/pricing/page.tsx`
7. `apps/console/src/app/(app)/apps/[slug]/plans/[planSlug]/entitlements/page.tsx`
8. `apps/console/src/app/(app)/apps/[slug]/plans/[planSlug]/(overview)/page.tsx`
9. `apps/console/src/app/(app)/apps/[slug]/subscribers/(list)/page.tsx`

### Enterprise (2 files) — facade `client.products` → `client.entitlementPlans`

In these two files, `client` is the server facade
(`client = await get876ServerClient()`). Replace `client.products` with
`client.entitlementPlans`:

10. `apps/enterprise/src/app/[slug]/apps/[appSlug]/page.tsx` (line ~36: `client.products.list({ appId: ..., status: 'active' })`)
11. `apps/enterprise/src/app/[slug]/apps/page.tsx` (line ~29: `client.products.list()`)

## DO NOT TOUCH (these are NOT the facade — leaving them is correct)

- `coreAdmin.products.*` anywhere (Console route handlers under
  `apps/console/src/app/api/products/**` and `apps/console/src/lib/billing/mirror.ts`)
  — this is the narrow `@876/admin` client, a different surface. Keep `products`.
- `client.products.*` where `client` is the **browser** RPC client from
  `@/lib/client` (e.g. `apps/console/src/app/(app)/apps/[slug]/plans/**/_components/*.tsx`
  and anything in `apps/billing/**`). Keep `products`.
- Any `/api/products` **route path**, folder name, or URL — do not rename routes.
- The `Product` TypeScript type / its imports from `@876/sdk` — the returned
  items are still `Product`; only the accessor changes.
- `packages/client/**`, `packages/admin/**`, `packages/sdk/**` — already handled.
- `apps/console/src/lib/client/products.ts` and other browser client modules.

## Verification (run these; both must pass)

```
pnpm --filter @876/console typecheck
pnpm --filter @876/enterprise typecheck
```

If a Console page still references `$876.products` after your edit, or either
typecheck fails with a `products`/`entitlementPlans` error, fix it. Do not
introduce any other change. Do not commit.
