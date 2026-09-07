import { calculateCatalogAmount } from '@/modules/billing-engine'
import type {
  PriceResolutionRequest,
  PricingResult,
  ResolvedPrice,
  ResolvedPriceList,
} from '@/types/pricing'

import { loadPricingContext } from './pricing.repository'
import { applyPercentageAdjustment } from './price-list-adjustment'

function key(priceId: string, quantity: number): string {
  return `${priceId}:${quantity}`
}

/**
 * Resolves Price/Price List selection separately from document total
 * calculation. Requests are batched so a document does not create N+1 pricing
 * queries.
 */
export async function resolvePrices(
  tenantId: string,
  currency: string,
  requests: readonly PriceResolutionRequest[],
  priceListId?: string | null
): Promise<
  PricingResult<{
    prices: Map<string, ResolvedPrice>
    priceList: ResolvedPriceList | null
  }>
> {
  const uniquePriceIds = [
    ...new Set(requests.map((request) => request.priceId)),
  ]
  const [prices, priceList] = await loadPricingContext(
    tenantId,
    uniquePriceIds,
    priceListId
  )
  if (prices.length !== uniquePriceIds.length)
    return {
      data: null,
      error: 'One or more selected prices were not found.',
      status: 404,
      code: 'billing/price-not-found',
    }
  if (priceListId && !priceList)
    return {
      data: null,
      error: 'The selected price list was not found.',
      status: 404,
      code: 'billing/price-list-not-found',
    }

  const priceById = new Map(prices.map((price) => [price.id, price]))
  const entryByPriceId = new Map(
    priceList?.entries.map((entry) => [entry.priceId, entry]) ?? []
  )
  const resolved = new Map<string, ResolvedPrice>()

  for (const request of requests) {
    if (!Number.isInteger(request.quantity) || request.quantity <= 0)
      return {
        data: null,
        error: 'Price quantity must be a positive integer.',
        status: 422,
        code: 'validation/invalid-request',
      }

    const price = priceById.get(request.priceId)
    if (!price)
      return {
        data: null,
        error: 'The selected price was not found.',
        status: 404,
        code: 'billing/price-not-found',
      }
    const entry = entryByPriceId.get(price.id) ?? null
    const resolvedCurrency =
      priceList?.mode === 'CUSTOM' && entry
        ? (priceList.currency ?? price.currency)
        : price.currency
    if (resolvedCurrency !== currency)
      return {
        data: null,
        error: 'Every selected price must use the transaction currency.',
        status: 422,
        code: 'billing/currency-mismatch',
      }

    try {
      const baseAmount = calculateCatalogAmount({
        pricingModel: price.pricingModel,
        unitAmount: price.unitAmount,
        quantity: request.quantity,
        packageSize: price.packageSize,
        tiers: price.tiers,
      })
      let lineAmount = baseAmount
      if (priceList?.mode === 'PERCENTAGE') {
        if (!priceList.direction || priceList.percentage === null)
          return {
            data: null,
            error: 'The selected percentage price list is incomplete.',
            status: 409,
            code: 'billing/price-list-invalid',
          }
        lineAmount = applyPercentageAdjustment(
          baseAmount,
          priceList.direction,
          priceList.percentage.toString(),
          priceList.rounding,
          priceList.roundingPrecision
        )
      } else if (priceList?.mode === 'CUSTOM' && entry) {
        const volumeTier = entry.tiers.find(
          (tier) =>
            request.quantity >= tier.fromUnit &&
            (tier.toUnit === null || request.quantity <= tier.toUnit)
        )
        lineAmount = volumeTier
          ? volumeTier.unitAmount * BigInt(request.quantity)
          : calculateCatalogAmount({
              pricingModel: price.pricingModel,
              unitAmount: entry.unitAmount ?? price.unitAmount,
              quantity: request.quantity,
              packageSize: price.packageSize,
              tiers: price.tiers,
            })
      }

      resolved.set(key(price.id, request.quantity), {
        priceId: price.id,
        itemId: price.item?.id ?? null,
        unitName: price.item?.unit ?? price.unitName,
        description:
          price.item?.name ??
          price.plan?.name ??
          price.addon?.name ??
          price.plan?.product.name ??
          price.addon?.product.name ??
          null,
        currency: resolvedCurrency,
        unitAmount:
          entry?.unitAmount ??
          price.unitAmount ??
          price.tiers[0]?.unitAmount ??
          0n,
        lineAmount,
      })
    } catch {
      return {
        data: null,
        error: 'The selected catalog price does not cover this quantity.',
        status: 422,
        code: 'billing/price-quantity-unavailable',
      }
    }
  }

  return {
    data: {
      prices: resolved,
      priceList: priceList ? { id: priceList.id, name: priceList.name } : null,
    },
    error: null,
  }
}

export async function resolvePrice(
  tenantId: string,
  currency: string,
  request: PriceResolutionRequest,
  priceListId?: string | null
): Promise<PricingResult<ResolvedPrice>> {
  const result = await resolvePrices(tenantId, currency, [request], priceListId)
  if (result.error !== null) return result
  const price = result.data.prices.get(key(request.priceId, request.quantity))
  return price
    ? { data: price, error: null }
    : {
        data: null,
        error: 'The selected price was not found.',
        status: 404,
        code: 'billing/price-not-found',
      }
}
