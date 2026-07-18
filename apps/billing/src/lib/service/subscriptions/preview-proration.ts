import { prisma } from '@/lib/db'
import type { SubscriptionProrationPreviewParams } from '@/types/subscription'

import { calculateProration } from '../billing-engine'
import { resolveSubscriptionComposition } from './composition'

/** Previews the charge or credit for replacing subscription items mid-period. */
export async function previewProration(
  tenantId: string,
  subscriptionId: string,
  params: SubscriptionProrationPreviewParams
) {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, tenantId },
    include: { items: true },
  })
  if (
    !subscription ||
    subscription.currentPeriodStart === null ||
    subscription.currentPeriodEnd === null
  )
    return null

  const priceIds = params.items.map((item) => item.priceId)
  const prices = await prisma.price.findMany({
    where: { id: { in: priceIds }, tenantId, isActive: true },
  })
  if (prices.length !== priceIds.length) return null
  const composition = resolveSubscriptionComposition(prices)
  if (composition.error !== null)
    return { object: 'proration_preview' as const, error: composition.error }

  const oldCurrency = subscription.items[0]?.currency
  const newCurrency = prices[0]?.currency
  if (!oldCurrency || oldCurrency !== newCurrency)
    return {
      object: 'proration_preview' as const,
      error: 'A subscription change must keep the existing currency.',
    }

  const oldAmount = subscription.items.reduce(
    (sum, item) => sum + (item.unitAmount ?? 0n) * BigInt(item.quantity),
    0n
  )
  const priceById = new Map(prices.map((price) => [price.id, price]))
  const newAmount = params.items.reduce((sum, item) => {
    const price = priceById.get(item.priceId)

    return sum + (price?.unitAmount ?? 0n) * BigInt(item.quantity)
  }, 0n)
  const unusedCredit = calculateProration(
    oldAmount,
    subscription.currentPeriodStart,
    subscription.currentPeriodEnd,
    params.changeAt
  )
  const remainingCharge = calculateProration(
    newAmount,
    subscription.currentPeriodStart,
    subscription.currentPeriodEnd,
    params.changeAt
  )
  const netAmount = remainingCharge - unusedCredit

  return {
    object: 'proration_preview' as const,
    error: null,
    subscriptionId,
    currency: oldCurrency,
    changeAt: params.changeAt,
    periodStart: subscription.currentPeriodStart,
    periodEnd: subscription.currentPeriodEnd,
    oldPeriodAmount: oldAmount.toString(),
    newPeriodAmount: newAmount.toString(),
    unusedCredit: unusedCredit.toString(),
    remainingCharge: remainingCharge.toString(),
    netAmount: netAmount.toString(),
    adjustment:
      netAmount > 0n ? 'INVOICE' : netAmount < 0n ? 'CREDIT_NOTE' : 'NONE',
  }
}
