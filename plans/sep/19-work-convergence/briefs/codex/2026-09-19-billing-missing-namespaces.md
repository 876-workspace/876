# Build the 11 `@876/billing` namespaces that block deleting the `any` facade

## Why this exists

`apps/billing/src/lib/service/index.ts` is an `any`-typed compatibility facade
introduced by commit `a01a4a018` (PR #269, 2026-08-14) when the Billing app's
Prisma datastore was removed. It replaced a properly typed per-resource layer
with one `LegacyBillingRecord` index-signature type under a file-level
`eslint-disable @typescript-eslint/no-explicit-any`. **90 files import it, and
it holds every remaining hand-written `any` in the repository.**

The user's directive, 2026-09-19: *"'any' should never be used in any case, must
always be typesafe"* and *"if something is being deprecated, it must be removed
and all references updated. no backwards compatibility."*

The facade cannot be deleted yet because it exposes 34 namespaces and
`@876/billing` covers only 23. **This task builds the missing 11.** It does not
delete the facade or touch its call sites — that is a separate change once the
client is complete.

## Your scope

`packages/billing` and `apps/billing-api` only.

## The 11 missing namespaces, with the routes the facade calls

| Namespace | Routes |
| --- | --- |
| `products` | `crud('/products')`, list takes `active?: boolean` |
| `plans` | `crud('/plans')`, list takes `active?: boolean`, `productId?: string` |
| `prices` | `crud('/prices')`, list takes `active?`, and an owner of `{ addonId?, itemId?, planId? }` |
| `addons` | `crud('/addons')`, list takes `active?`, `productId?` |
| `priceLists` | `crud('/price-lists')`, list takes `active?` |
| `refunds` | `crud('/refunds')` |
| `vendors` | `crud('/vendors')` |
| `tenants` | `POST /internal/projections/tenants` (list, body `{ organizationIds }`), `GET /api/v1/integrations/organizations/:organizationId`, and `GET /tenants/resolve?slug=` |
| `dashboard` | `GET /internal/projections/tenants/:tenantId/dashboard` |
| `financeConnections` | `GET /finance-connections/:appId` |
| `stats` | empty in the facade — **check whether `apps/billing-api` actually serves a stats route before building anything.** If it does not, report that and build nothing for it. |

`crud(path)` in the facade means list / retrieve / create / update / delete
against `/api/v1<path>`, with `retrieve`, `update` and `delete` keyed by id.

## How to build them

**Read two existing resources first and copy their shape exactly:**

```
packages/billing/src/resources/customers.ts      (a full CRUD resource)
packages/billing/src/resources/currencies.ts     (a small read-only one)
packages/billing/src/client.ts                   (how resources are registered)
```

Then, per namespace:

- a typed resource module in `packages/billing/src/resources/<name>.ts`;
- Zod schemas for every request and response — **Zod is the single source of
  truth** (`.agents/rules/express-api.md`); do not hand-write a second contract;
- registration in `client.ts` beside the existing 23;
- the verb vocabulary from `.agents/rules/sdk-conventions.md`: `create`,
  `retrieve`, `list`, `search`, `update`, `delete`. **`delete`, never `del`.**
  Expose only the verbs the backend actually serves.

### Derive the response shapes from the server, not from the facade

The facade's types are `any`, so they tell you nothing. For each route, read the
**serializer and Zod schema in `apps/billing-api`** and derive the real shape
from there. If a route has no serializer, say so in your report rather than
guessing a shape.

If `apps/billing-api` does not serve one of the routes above, **report it and
build nothing for that namespace.** A client method with no server route is
worse than a missing one.

### Contract rules that bind you

- Every serialized resource carries its literal `object` discriminator
  (`.agents/rules/stripe-api-pattern.md`).
- Results use the `{ data, error }` envelope; expected failures are **values,
  not throws** (`.agents/rules/error-handling.md`).
- Money stays in integer minor units, and a rate or percentage stays a **string**
  end to end (`.agents/rules/billing-data-plane.md`). Never a JS `number`.
- Existing v1 wire field spellings are a legacy public contract — **match what
  the server actually sends**; do not "fix" a snake_case field to camelCase
  here.

## Hard prohibitions

- Do **not** delete, rename, or edit `apps/billing/src/lib/service/` or any of
  its 90 call sites. A later change does that.
- Do **not** add `any`, `as any`, `as unknown as`, `eslint-disable`,
  `@ts-ignore`, or `@ts-expect-error` **anywhere**. This task exists to remove
  `any`; it cannot introduce it. If a server contract genuinely cannot be typed,
  stop and report that route.
- Do **not** invent a route, a field, or a response shape. Read the server.
- Do **not** run `prisma migrate` or any command that touches a database.
- Do **not** touch any workspace other than `packages/billing` and
  `apps/billing-api`.
- Do **not** `git commit`, create a branch, or open a PR.

## Tests

Minimum **3** `it()` cases per namespace you build, counted per namespace in
your report: the request path and params sent, the parsed success shape, and an
error response surfacing as a **value**. Follow `.agents/rules/testing.md` —
`toHaveBeenCalledWith` with exact arguments, complete result shapes, never a
bare `toBeDefined()`.

## Verify — one command at a time, ~3 GB free on this host

```
pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api test
grep -rn "\bany\b" packages/billing/src/resources | grep -vE "anyOf|company|\.test\."   # expect 0
```

If `pnpm` fails with `runDepsStatusCheck`, run `pnpm install` once first.

## Report

`plans/sep/19-work-convergence/reports/codex/2026-09-19-billing-namespaces.md` —
per namespace: built or skipped and why, the routes it covers, where you read
the response shape from, the counted `it()` total; plus any route with no
serializer, any namespace with no server route, the final grep, verification
output, and anything you could not verify. A truthful "not verified" beats a
confident claim.
