# Codex brief — Seed a free default price per subscribable app (@876/api)

## Context & why

Every new org is subscribed to `876-enterprise` + `876-billing` (+ its source app)
by `provisionOrgApps` in `apps/api/src/services/provisioning.ts`. Each subscription's
price comes from `repository.findDefaultPriceForApp(appId)`
(`apps/api/src/services/provisioning.repository.ts`), which returns the oldest active
price on the oldest active product scoped to that app — or **null** when the app has
no active price. There is currently **NO seed that creates any `Product` or `Price`
row**, so `findDefaultPriceForApp` resolves to null for every app and orgs get
**active-but-priceless** subscriptions. This closes that gap.

**Design is already decided below — implement it exactly, do not re-derive.** Follow
`.agents/rules/git.md` (no AI attribution) and `.claude/rules/express-api.md` (seeds
are idempotent CLI ops; only `*.repository.ts` may touch `prisma`; snake_case DB via
`@map`; timestamps are Unix seconds `bigint`). DO NOT COMMIT — the orchestrator commits.

### The one safety rule that governs the whole seed

**Only create a free product/price for an app that currently has NO active price.**
If `findActivePriceForApp(appId)` already returns a row (operator created pricing in
Console, or a prior run seeded it), do nothing for that app. This makes the seed a
pure safety net: it can never override, duplicate, or shadow operator-created pricing,
and it is fully idempotent. All amounts are **0** (a free tier), so it seeds no revenue
data.

## File scope (only these)

- `apps/api/src/seeds/default-prices.repository.ts` (NEW)
- `apps/api/src/seeds/default-prices.ts` (NEW)
- `apps/api/src/seeds/index.ts` (wire the new step in)
- `apps/api/src/seeds/default-prices.test.ts` (NEW — colocated, matching `seeds/features.test.ts`)

Do NOT touch `provisioning.ts`, `provisioning.repository.ts`, `plans.ts`, or
`plans.repository.ts`. Read `plans.repository.ts` and `bootstrap.ts` for patterns
(id generation via `generateId`, `nowUnixSeconds`, `prisma` usage), but add the new
repository helpers in the NEW `default-prices.repository.ts`, not in `plans.repository.ts`.

---

## Part 1 — the repository (`default-prices.repository.ts`)

Mirror the import/style of `plans.repository.ts` (it imports `prisma` from the db
client — copy that exact import path). Add exactly these functions:

```ts
import { prisma } from '@/db/client' // <-- match the EXACT path plans.repository.ts uses

export type SeedAppRow = { id: string; slug: string; name: string }

/** The app row a free price is seeded against. Null when the app does not exist. */
export async function findAppBySlug(slug: string): Promise<SeedAppRow | null> {
  return prisma.app.findFirst({
    where: { slug },
    select: { id: true, slug: true, name: true },
  })
}

/**
 * The app's current default price, if any — the same predicate
 * `provisioning.repository.findDefaultPriceForApp` uses. A non-null result means
 * the app already has pricing and the seed must leave it untouched.
 */
export async function findActivePriceForApp(
  appId: string
): Promise<{ id: string } | null> {
  return prisma.price.findFirst({
    where: { status: 'active', product: { appId, status: 'active' } },
    orderBy: [{ product: { createdAt: 'asc' } }, { createdAt: 'asc' }],
    select: { id: true },
  })
}

/** Look up a product by its unique slug (used for idempotency on the product row). */
export async function findProductBySlug(
  slug: string
): Promise<{ id: string } | null> {
  return prisma.product.findUnique({ where: { slug }, select: { id: true } })
}

export async function createProduct(data: {
  id: string
  slug: string
  name: string
  appId: string
  now: bigint
}): Promise<{ id: string }> {
  return prisma.product.create({
    data: {
      id: data.id,
      slug: data.slug,
      name: data.name,
      appId: data.appId,
      status: 'active',
      active: true,
      createdAt: data.now,
      updatedAt: data.now,
    },
    select: { id: true },
  })
}

export async function createFreePrice(data: {
  id: string
  productId: string
  name: string
  now: bigint
}): Promise<{ id: string }> {
  return prisma.price.create({
    data: {
      id: data.id,
      productId: data.productId,
      name: data.name,
      status: 'active',
      active: true,
      type: 'recurring',
      billingInterval: 'month',
      intervalCount: 1,
      unitAmount: BigInt(0),
      currency: 'jmd',
      billingScheme: 'per_unit',
      createdAt: data.now,
      updatedAt: data.now,
    },
    select: { id: true },
  })
}
```

Verify the `Product`/`Price` field names against `apps/api/prisma/schema/product.prisma`
and `price.prisma` — the client is camelCase (`unitAmount`, `billingInterval`,
`createdAt`). `unitAmount` is `BigInt?` in the schema, so pass `BigInt(0)`.

---

## Part 2 — the seed (`default-prices.ts`)

```ts
import { getLogger } from '@/platform/logger'
import { generateId } from '@/platform/ids'
import { nowUnixSeconds } from '@/platform/timestamps'

import {
  createFreePrice,
  createProduct,
  findActivePriceForApp,
  findAppBySlug,
  findProductBySlug,
} from './default-prices.repository'

const log = getLogger('seeds:default-prices')

/**
 * Apps a new org can be subscribed to (default apps + product apps a user can sign
 * up through). `console` is internal and never subscribed, so it is excluded. The
 * slugs mirror `bootstrap.ts` PLATFORM_APPS.
 */
export const FREE_PRICE_APP_SLUGS = [
  '876-consumer',
  '876-enterprise',
  '876-couriers',
  '876-billing',
] as const

export type DefaultPriceSeedSummary = {
  appsConsidered: number
  pricesCreated: number
  skippedExistingPrice: number
  skippedMissingApp: number
}

/**
 * Ensure every subscribable app has a free ($0) default price so a newly
 * provisioned org resolves a price instead of an active-but-priceless subscription.
 *
 * Safety net only: an app that already has an active price is left untouched, so
 * this can never override or duplicate operator-created pricing. Idempotent.
 */
export async function seedDefaultAppPrices(): Promise<DefaultPriceSeedSummary> {
  const now = BigInt(nowUnixSeconds())

  let pricesCreated = 0
  let skippedExistingPrice = 0
  let skippedMissingApp = 0

  for (const slug of FREE_PRICE_APP_SLUGS) {
    const app = await findAppBySlug(slug)
    if (!app) {
      skippedMissingApp += 1
      log.warn({ slug }, 'default_prices.app_missing')
      continue
    }

    // Never override operator-created pricing.
    if (await findActivePriceForApp(app.id)) {
      skippedExistingPrice += 1
      continue
    }

    // Idempotent product by slug: a prior partial run may have created the product
    // but not the price.
    const productSlug = `${slug}-free`
    const existingProduct = await findProductBySlug(productSlug)
    const product =
      existingProduct ??
      (await createProduct({
        id: generateId('product'),
        slug: productSlug,
        name: `${app.name} Free`,
        appId: app.id,
        now,
      }))

    await createFreePrice({
      id: generateId('price'),
      productId: product.id,
      name: `${app.name} Free`,
      now,
    })
    pricesCreated += 1

    log.info(
      { app_id: app.id, slug, product_id: product.id },
      'default_prices.free_price_seeded'
    )
  }

  return {
    appsConsidered: FREE_PRICE_APP_SLUGS.length,
    pricesCreated,
    skippedExistingPrice,
    skippedMissingApp,
  }
}
```

Confirm `generateId('product')` and `generateId('price')` are valid keys — check
`apps/api/src/platform/ids.ts` (they map to `prd`/`prc`). If the key names differ,
use the exact ones defined there.

---

## Part 3 — wire into the seed runner (`index.ts`)

Add a `defaultPrices` step that runs **after `plans`** (a price is only meaningful once
apps exist; running last is safe). Mirror the existing steps exactly:

1. Import: `import { seedDefaultAppPrices } from './default-prices'`
2. Add `defaultPrices` to `RunSeedsSummary` typed as
   `Awaited<ReturnType<typeof seedDefaultAppPrices>> | null`, initialised to `null`.
3. After the `plans` block, add:

```ts
if (shouldRun('defaultPrices')) {
  log.info('seeds.default_prices.started')
  summary.defaultPrices = await seedDefaultAppPrices()
  log.info({ summary: summary.defaultPrices }, 'seeds.default_prices.completed')
}
```

Update the header doc comment's numbered list to include the new step (6. defaultPrices).

---

## Part 4 — tests (`default-prices.test.ts`, colocated in `seeds/` like `features.test.ts`)

Mock the repository module (`vi.mock('../default-prices.repository', ...)`) — this seed
does no direct prisma, all IO is via the repo, so mock the five repo functions.
Follow `.claude/rules/testing.md`: exact call args, exact summary shape, both branches.

Cover:

- **Seeds a free price for an app with no active price**: `findAppBySlug` → an app,
  `findActivePriceForApp` → null, `findProductBySlug` → null ⇒ `createProduct` called
  with `{ slug: '<slug>-free', appId, name: '<App name> Free' }` and `createFreePrice`
  called with that product id; summary `pricesCreated` counts it.
- **Skips an app that already has an active price**: `findActivePriceForApp` → a row ⇒
  `createProduct`/`createFreePrice` NOT called; `skippedExistingPrice` incremented.
  Assert `createFreePrice` `.not.toHaveBeenCalled()` for that app.
- **Reuses an existing product** (partial prior run): `findActivePriceForApp` → null,
  `findProductBySlug` → a product ⇒ `createProduct` NOT called, `createFreePrice`
  called with the existing product id.
- **Skips a missing app**: `findAppBySlug` → null ⇒ nothing created,
  `skippedMissingApp` incremented, and it does NOT short-circuit the remaining apps.
- Assert the full `DefaultPriceSeedSummary` shape for a representative run.

Make the mocks per-slug deterministic (e.g. `findAppBySlug` returns an app for a known
slug and null for a chosen "missing" one) so counts are exact. Freeze time if the test
asserts `now` (use `vi.useFakeTimers()` + `vi.setSystemTime()`, restore in `afterEach`).

---

## Verify (run all, must pass)

```
pnpm --filter @876/api typecheck
pnpm --filter @876/api test
pnpm --filter @876/api lint
```

The @876/api suite emits ~5 Prisma-Accelerate "fetch failed: bad port" unhandled
rejections in the sandbox (no DB) — environmental, not test failures.

Do NOT commit. Report exactly which files you changed and any deviations from this brief.
