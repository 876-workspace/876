import type { PriceItem, PricingSetup } from '../_components/plan-pricing-table'

/** The price fields this view reads; a structural subset of the API resource. */
export type PricingSetupPrice = {
  id: string
  name?: string | null
  nickname?: string | null
  unit_amount: number | null
  currency: string
  billing_interval?: string | null
  interval_count?: number | null
  billing_scheme: string
  tiers_mode?: string | null
  trial_period_days?: number | null
  tax_behavior?: string | null
  status: string
}

/**
 * Builds the props for the client `PricingTable`.
 *
 * Everything returned here crosses the RSC boundary, so it must stay plain,
 * serializable data — no functions. Paths are passed as strings and the client
 * derives per-row hrefs itself; a closure here throws "Functions cannot be
 * passed directly to Client Components" and the whole segment fails to render.
 */
export function buildPricingSetup(params: {
  slug: string
  planSlug: string
  productId: string
  prices: readonly PricingSetupPrice[] | null | undefined
}): PricingSetup {
  const { slug, planSlug, productId, prices } = params
  const basePath = `/apps/${slug}/plans/${planSlug}/pricing`

  const items: PriceItem[] = (prices ?? []).map((price) => ({
    id: price.id,
    name: price.name ?? null,
    nickname: price.nickname ?? null,
    unit_amount: price.unit_amount,
    currency: price.currency,
    billing_interval: price.billing_interval ?? null,
    interval_count: price.interval_count ?? null,
    billing_scheme: price.billing_scheme,
    tiers_mode: price.tiers_mode ?? null,
    trial_period_days: price.trial_period_days ?? null,
    tax_behavior: price.tax_behavior ?? null,
    status: price.status,
  }))

  return {
    productId,
    prices: items,
    newHref: `${basePath}/new`,
    basePath,
  }
}
