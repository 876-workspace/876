# Codex Brief — Backend & contract repair for Item Variants + Storage media

**Run:** `plans/2026-09-07-item-variants-media`
**Branch:** `feature/item-variants-media` (already checked out — do NOT create, rename, merge, rebase, or delete any branch)
**Model:** gpt-5.6-terra, high reasoning

## Context

The branch was implemented by GPT web, which **executes nothing** — no tests, no typecheck, no
build. Every failure below is real and was measured locally by the orchestrator after pulling.
The implementation itself is largely sound; what is broken is that frozen-contract tests and
fixtures were never updated to match the intentional new surface.

The feature: optional Item **variants** in the shared 876 finance Item domain (`apps/billing-api`,
consumed by both 876 Billing and 876 Invoice), plus Item/Variant images stored through 876 Storage
with opaque `fileId` identity.

## Your file scope — STAY INSIDE IT

You may edit only:

- `apps/billing-api/**`
- `packages/billing/**`
- `packages/storage/**`

You must **NOT** touch (other agents are working in these concurrently):

- `apps/storage-api/**`  ← the orchestrator is hardening authorization there right now
- `packages/billing-ui/**`
- `apps/billing/**`, `apps/invoice/**`
- `plans/**` except your own report file named below

## The measured failures — fix every one

### 1. `apps/billing-api/src/modules/catalog/repositories/items/stock.test.ts` — 4 failing, 6 typecheck errors

`StockLine` gained a required `variantId` field and `resolveTracked` in
`src/modules/catalog/repositories/items/stock.ts` now issues an additional variant query. The test
fixtures were never updated, so:

- 6 × `TS2741: Property 'variantId' is missing in type '{ itemId: string; quantity: number; }'`
  at lines 77, 78, 121, 122, 153, 172;
- 4 × runtime `TypeError: Cannot read properties of undefined (reading 'findMany')` from
  `stock.ts:93` — the mocked Prisma client has no variant delegate.

Fix the fixtures and the mock so the existing assertions hold. **Do not weaken the production
types to make the test easier** — `variantId` stays required on `StockLine` if that is what the
implementation intends; add it to the fixtures instead.

While you are in this file, also **add** the variant coverage the feature needs and that no test
currently provides:

- duplicate invoice lines aggregate by `(itemId, variantId)`, not by `itemId` alone;
- a variant Item decrements the **selected variant's** stock, never the parent's;
- insufficient variant stock is denied;
- `allowOutOfStock = true` permits negative variant stock;
- the recorded stock movement carries `variantId`;
- void restores the exact variant target that was decremented;
- single (non-variant) Item behaviour is unchanged.

**Minimum 7 new `it()` cases in this file.** Assert full result shapes and exact mock arguments
per `.agents/rules/testing.md` — `toHaveBeenCalledWith(...)`, not `toHaveBeenCalled()`.

### 2. `apps/billing-api/src/http/auth/__tests__/full-route-auth-matrix.test.ts` — frozen route count

The branch adds new authenticated operations (item preferences, item variants, item media, and
their `/integrations/...` counterparts). The test asserts exact operation counts:

```
expect(operations).toHaveLength(222)
expect(protectedPublicOperations()).toHaveLength(221)
```

Determine the **actual** new counts by running the suite, update both numbers, and **extend the
existing explanatory comment above them** in the established style — it already records the
`221 -> 220` and `220 -> 222` transitions with the reason for each. Add a `222 -> N` entry naming
the routes that were added. That comment is the audit trail; a bare number change is not
acceptable.

Every newly added operation must be **authenticated**. If any new route turns up in
`operations` but not in `protectedPublicOperations()`, that is a security defect in the route
declaration, not a number to adjust — fix the route's guard and say so in your report.

### 3. `apps/billing-api/src/test/openapi-contract.test.ts` — frozen OpenAPI contract

The frozen contract no longer matches the generated document. Regenerate it with the project's
own tooling — **do not hand-edit the frozen snapshot**:

```bash
pnpm --filter @876/billing-api api:contract:generate
```

Then confirm both:

```bash
pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/billing-api test
```

Read the resulting diff before accepting it. Every added path must be one of the intended new
variant/preference/media routes. **If the regeneration removes or alters a pre-existing path, stop
and report it** — that is an accidental breaking change to a frozen public contract, and per
`.agents/rules/express-api.md` an established v1 wire contract may not change without a
coordinated migration.

### 4. `packages/billing/src/settings-catalog.test.ts`

`expected [ { key: 'product-variants', … } ] to deeply equal []` — the test asserts the finance
module catalogs declare module state only and leave preferences empty. The branch deliberately
adds a `product-variants` **preference** under the existing `items` module
(`.agents/rules/module-settings.md`: a module is org-controlled usage; this is a preference on it,
not a new module and not a feature flag).

The assertion's premise is now outdated. Update it to assert the **specific intended** catalog
shape — the `items` module carrying exactly the `product-variants` preference with
`default: false` — rather than loosening it to "preferences may be non-empty". A frozen test that
stops constraining anything is worse than no test.

### 5. `packages/billing/src/items.test.ts`

`items resource > uses the canonical tenant item CRUD paths and response contracts`:
`expected undefined to deeply equal [ { object: 'item', … } ]`.

**This one may be a real regression, not a stale fixture.** `packages/billing/src/resources/items.ts`
was heavily modified (+291 lines). Diagnose before you edit: determine whether the resource still
returns the documented `{ data, error }` envelope and the `{ object: 'list', data, hasMore, url,
totalCount }` list shape (`.agents/rules/stripe-api-pattern.md`). If the resource is wrong, fix the
resource. If the test's fixture is wrong, fix the test. **Say which it was in your report** — do
not silently adjust the test to match broken behaviour.

### 6. `packages/storage` — three frozen-surface tests

- `src/error-parity.test.ts` and `src/types/common.test.ts`: the service error-code set grew from
  12 to 14. Add the two new codes to the frozen lists **by name**, and confirm each is a
  namespaced kebab-case code per `.agents/rules/naming.md` (`storage/<kebab>`), registered in the
  owning catalog per `.agents/rules/error-handling.md`.
- `src/index.exports.test.ts`: `client surface only exposes uploads and files namespaces` —
  `resourceLinks` was added. Update the assertion to the new exact three-namespace surface and
  update the test's name so it stops claiming "only uploads and files".

## Hard constraints

- **No `eslint-disable`, no `@ts-ignore`, no `@ts-expect-error`, no `as any`.** `as unknown as T`
  only for a genuine external mismatch, and justify it in the report.
- **Do not weaken production code to make a test pass** — no making a required field optional, no
  loosening a signature, no deleting an assertion because it is inconvenient.
- **Do not commit.** The orchestrator stages and commits. No AI attribution anywhere.
- Do not fix `apps/billing-api/src/modules/access/__tests__/finance-catalog-drift.test.ts` — its
  lint error (`no-assign-module-variable`) is **pre-existing on `main`** and out of scope.
- Read before writing: `.agents/rules/ai-code-quality.md`, `.agents/rules/testing.md`,
  `.agents/rules/error-handling.md`, `.agents/rules/express-api.md`,
  `.agents/rules/stripe-api-pattern.md`, `.agents/rules/naming.md`,
  `.agents/rules/module-settings.md`.

## Verification — run these yourself, and report the real output

```bash
pnpm --filter @876/billing-api typecheck
pnpm --filter @876/billing-api boundaries
pnpm --filter @876/billing-api test
pnpm --filter @876/billing-api api:contract:check
pnpm --filter @876/billing-api db:validate
pnpm --filter @876/billing typecheck
pnpm --filter @876/billing test
pnpm --filter @876/storage typecheck
pnpm --filter @876/storage test
```

`pnpm --filter @876/billing-api lint` will still report the one pre-existing `main` error described
above; everything else must be clean.

## Report

Write `plans/2026-09-07-item-variants-media/reports/codex/2026-09-07-backend-contract-repair.md`
containing: each of the six items with what you actually changed and why; the **counted** number of
`it()` cases you added per file; whether item 5 was a resource bug or a fixture bug; the new route
counts and the routes behind them; the full verification output; and anything you could not fix,
stated plainly.
