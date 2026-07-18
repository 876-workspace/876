import { prisma } from '@/lib/db'

import { applyPercentageAdjustment, calculateCatalogAmount } from '../pricing'

/** Resolves one quantity against an immutable price and optional price list. */
export async function resolveAmount(
  tenantId: string,
  priceId: string,
  quantity: number,
  priceListId?: string | null
) {
  const [price, priceList] = await Promise.all([
    prisma.price.findFirst({
      where: { id: priceId, tenantId, isActive: true },
      include: { tiers: true },
    }),
    priceListId
      ? prisma.priceList.findFirst({
          where: { id: priceListId, tenantId, isActive: true },
          include: {
            entries: {
              where: { priceId },
              include: { tiers: { orderBy: { fromUnit: 'asc' } } },
            },
          },
        })
      : null,
  ])
  if (!price) return null

  const baseAmount = calculateCatalogAmount(price, quantity)
  if (!priceList)
    return { currency: price.currency, amount: baseAmount, priceList: null }

  if (priceList.mode === 'PERCENTAGE') {
    if (!priceList.direction || priceList.percentage === null)
      throw new Error('Percentage price list is incomplete.')
    return {
      currency: price.currency,
      amount: applyPercentageAdjustment(
        baseAmount,
        priceList.direction,
        Number(priceList.percentage),
        priceList.rounding,
        priceList.roundingPrecision
      ),
      priceList,
    }
  }

  const entry = priceList.entries[0]
  if (!entry)
    return { currency: price.currency, amount: baseAmount, priceList: null }
  const volumeTier = entry.tiers.find(
    (tier) =>
      quantity >= tier.fromUnit &&
      (tier.toUnit === null || quantity <= tier.toUnit)
  )
  const amount = volumeTier
    ? volumeTier.unitAmount * BigInt(quantity)
    : calculateCatalogAmount(
        { ...price, unitAmount: entry.unitAmount ?? price.unitAmount },
        quantity
      )
  return { currency: priceList.currency ?? price.currency, amount, priceList }
}
