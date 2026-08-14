import { generateId } from '@/platform/ids'
import { getLogger } from '@/platform/logger'
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
