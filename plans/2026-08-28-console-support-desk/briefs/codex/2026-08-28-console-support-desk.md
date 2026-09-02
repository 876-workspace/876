# Console's own support desk at `/support`

## Why this exists

876 builds CRM and 876 also needs a support desk. Rather than building a second
one, Console gets a `/support` surface pointed at **876's own CRM tenant**. We
use our own product; there is no second implementation.

The platform organization is the one whose slug is the Billing platform tenant
slug (`BILLING_PLATFORM_TENANT_SLUG`, currently `efesto`). Every 876
organization is already a customer in that org's registry, delivered by Core's
`customer.ensure` outbox.

## The key design constraint — read this before writing anything

`/support` is **not** a new data layer. It is the *existing* operator-tier CRM
routes with the platform organization's id bound instead of a URL segment.
`apps/console/src/app/(app)/orgs/[slug]/requests/` already does exactly this
work against `$876.requests.*`. Reuse its components; do not fork them.

If you find yourself writing a second `RequestsTable`, stop — extract the
existing one instead.

## Scope

1. **`apps/console/src/lib/platform-org.ts`** (new)
   - Export `getPlatformOrganization()`, wrapped in `React.cache` so several
     server components on one render share a single round trip.
   - It reads the slug from `process.env.CONSOLE_PLATFORM_ORG_SLUG ?? 'efesto'`
     and resolves the organization through `$876` (see
     `apps/console/src/lib/876/index.ts` for the facade; org lookup by slug
     already exists — find it, do not invent a new client method).
   - Return `null` when unresolvable. **Do not throw**: a misconfigured slug
     must render an explanatory empty state, not a 500 on a nav click.
   - Add `CONSOLE_PLATFORM_ORG_SLUG=efesto` to `apps/console/.env.example` with
     a one-line comment.

2. **`apps/console/src/app/(app)/support/`** (new route)
   - `(list)/page.tsx` — the request list for the platform org.
   - `[requestId]/page.tsx` — the request detail.
   - `new/page.tsx` — create a request.
   - Each mirrors the equivalent file under `orgs/[slug]/requests/`, but
     resolves the organization id from `getPlatformOrganization()` instead of
     `params.slug`.

3. **Shared components.** The three files in
   `orgs/[slug]/requests/_components/` are now used by two route subtrees.
   Per `.claude/rules/app-structure.md` a route may never reach sideways into
   another subtree's `_components/`, so **move them** to
   `apps/console/src/features/support/components/` and update both callers.
   Move the `_components/requests-skeleton-columns.ts` with them.

4. **Nav.** Add a `Support` entry to `apps/console/src/components/shell/nav-config.ts`
   in the **first** group, after `Organizations`. Use the `LifeBuoy` icon from
   `@876/ui/icons` if it exists — otherwise pick an existing one and say which
   in your report. Colour `var(--876-blue)`.
   `apps/console/src/components/shell/nav-config.test.ts` asserts the nav shape;
   update it.

## Rules you must follow

- `.claude/rules/data-loading.md` — the toolbar, heading and table column
  headers render immediately; only the rows sit inside `<Suspense>`, with
  `DataTableSkeleton` carrying the real column set. Copy how
  `orgs/[slug]/requests/(list)/page.tsx` already does it.
- `.claude/rules/app-layout.md` — `ResourceToolbar`, `StatusFilterHeading` for
  the status filter, `primaryVariant="info"`, bare verb button labels.
- `.claude/rules/api-access.md` — server components read through `$876`
  directly. No server actions. Mutations go through a route handler that calls
  `requireConsolePermission` first.
- **Do not** add `proxy.ts` or `middleware.ts`.
- **Do not** add an `eslint-disable` comment or an `as any` cast anywhere. If a
  gate fails, fix the cause.
- Let a data error propagate to the route error boundary. Do **not** catch it
  and render an inline "failed to load" card.

## Verification — you must run all of these and report the real output

```bash
pnpm --filter @876/console typecheck
pnpm --filter @876/console lint
pnpm --filter @876/console test
node scripts/check-app-structure.mjs
```

Do not commit. Report which files you created, moved, and changed.
