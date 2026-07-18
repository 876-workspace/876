import type { IntervalUnit, PriceType } from '@/lib/db'

type SubscriptionPriceTerms = {
  planId: string | null
  currency: string
  unitAmount: bigint | null
  priceType: PriceType
  intervalUnit: IntervalUnit | null
  intervalCount: number | null
}

type CatalogSubscriptionPrice = SubscriptionPriceTerms & {
  addonId: string | null
  plan:
    | (object & {
        id: string
        productId: string
        addonAssociations: Array<{
          addonId: string
          events: string[]
          addon: { name: string; priceType: PriceType }
        }>
      })
    | null
  addon:
    | (object & {
        productId: string
        planAssociations: Array<{ planId: string; isActive: boolean }>
      })
    | null
}

type PriceWithCadence = SubscriptionPriceTerms & {
  intervalUnit: IntervalUnit
  intervalCount: number
}

type SubscriptionCompositionResult =
  | {
      data: {
        intervalUnit: IntervalUnit
        intervalCount: number
      }
      error: null
    }
  | { data: null; error: string }

/** Resolves the shared commercial terms for a valid subscription price set. */
export function resolveSubscriptionComposition(
  prices: readonly SubscriptionPriceTerms[]
): SubscriptionCompositionResult {
  if (prices.length === 0)
    return { data: null, error: 'A subscription requires at least one price.' }

  if (prices.some((price) => price.priceType !== 'RECURRING'))
    return { data: null, error: 'Subscriptions require recurring prices.' }

  const recurringPrices = prices.filter(hasCadence)
  if (recurringPrices.length !== prices.length)
    return {
      data: null,
      error: 'Each subscription price needs a recurring cadence.',
    }

  if (recurringPrices.filter((price) => price.planId !== null).length !== 1)
    return {
      data: null,
      error: 'A subscription requires exactly one plan price.',
    }

  const [firstPrice] = recurringPrices
  if (!firstPrice)
    return { data: null, error: 'A subscription requires at least one price.' }

  const sameCadence = recurringPrices.every(
    (price) =>
      price.currency === firstPrice.currency &&
      price.intervalUnit === firstPrice.intervalUnit &&
      price.intervalCount === firstPrice.intervalCount
  )
  if (!sameCadence)
    return {
      data: null,
      error: 'Subscription prices must use one currency and billing cadence.',
    }

  return {
    data: {
      intervalUnit: firstPrice.intervalUnit,
      intervalCount: firstPrice.intervalCount,
    },
    error: null,
  }
}

/** Enforces plan/add-on catalog availability for an agreement composition. */
export function validateSubscriptionCatalogComposition(
  prices: readonly CatalogSubscriptionPrice[],
  requiredEvent: 'SUBSCRIPTION_ACTIVATION' | 'PLAN_CHANGE'
): string | null {
  const planPrice = prices.find((price) => price.planId !== null)
  const plan = planPrice?.plan
  if (!plan) return 'A subscription requires a plan price.'

  const addonPrices = prices.filter((price) => price.addon !== null)
  if (
    addonPrices.some(
      (price) =>
        price.addon !== null &&
        (price.addon.productId !== plan.productId ||
          !price.addon.planAssociations.some(
            (association) =>
              association.planId === plan.id && association.isActive
          ))
    )
  )
    return 'One or more add-ons are not available for this plan.'

  const selectedAddonIds = new Set(
    addonPrices.flatMap((price) => (price.addonId ? [price.addonId] : []))
  )
  const missingMandatory = plan.addonAssociations.find(
    (association) =>
      association.events.includes(requiredEvent) &&
      association.addon.priceType === 'RECURRING' &&
      !selectedAddonIds.has(association.addonId)
  )

  return missingMandatory
    ? `The ${missingMandatory.addon.name} add-on is required for this plan.`
    : null
}

function hasCadence(price: SubscriptionPriceTerms): price is PriceWithCadence {
  return price.intervalUnit !== null && price.intervalCount !== null
}
