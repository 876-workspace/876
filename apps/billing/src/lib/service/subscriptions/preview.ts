import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'

import {
  calculateDiscount,
  calculateInvoiceChargeLines,
} from '../billing-engine'
import { calculateCatalogAmount } from '../pricing'
import { adjustRenewalAmount } from './renewal-pricing'
import { prorateInitialStubAmount } from './amounts'

/** Calculates the next subscription invoice without writing financial data. */
export async function previewUpcomingInvoice(
  tenantId: string,
  subscriptionId: string,
  asOf = nowUnixSeconds()
) {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, tenantId, deletedAt: null },
    include: {
      customer: { select: { id: true, name: true } },
      items: {
        where: { isActive: true },
        include: {
          price: {
            include: {
              tiers: true,
              item: true,
              plan: { include: { product: true } },
              addon: { include: { product: true } },
            },
          },
        },
      },
      charges: {
        where: { status: 'UNBILLED', invoiceBehavior: 'NEXT_INVOICE' },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      },
      discounts: {
        where: {
          status: 'ACTIVE',
          startsAt: { lte: asOf },
          OR: [{ endsAt: null }, { endsAt: { gt: asOf } }],
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!subscription) return null

  const currency = subscription.items[0]?.currency ?? null
  if (!currency) return null
  if (
    subscription.charges.some(
      (charge) =>
        charge.currency !== currency ||
        charge.taxBehavior !== subscription.taxBehavior
    )
  )
    throw new Error(
      'Unbilled charges must match the subscription currency and tax behavior.'
    )

  const recurring = subscription.items.map((item) => {
    const baseUnitAmount =
      subscription.renewalPricingPolicy === 'RETAIN_EXISTING'
        ? (item.unitAmount ?? item.price.unitAmount)
        : item.price.unitAmount
    const unitAmount = adjustRenewalAmount(
      baseUnitAmount,
      subscription.renewalPricingPolicy,
      subscription.renewalAdjustmentPercent?.toString() ?? null
    )

    return {
      item,
      unitAmount,
      subtotalAmount: prorateInitialStubAmount(
        calculateCatalogAmount({ ...item.price, unitAmount }, item.quantity),
        subscription,
        item.price
      ),
    }
  })
  const chargeSubtotals = subscription.charges.map(
    (charge) => charge.unitAmount * BigInt(charge.quantity)
  )
  const lineSubtotals = [
    ...recurring.map((line) => line.subtotalAmount),
    ...chargeSubtotals,
  ]
  const subtotalAmount = lineSubtotals.reduce((sum, amount) => sum + amount, 0n)
  const itemDiscounts = lineSubtotals.map(() => 0n)
  let transactionDiscountAmount = 0n
  for (const discount of subscription.discounts) {
    if (discount.scope === 'ITEM' && discount.subscriptionItemId) {
      const itemIndex = recurring.findIndex(
        ({ item }) => item.id === discount.subscriptionItemId
      )
      if (itemIndex < 0) continue
      const remaining = lineSubtotals[itemIndex]! - itemDiscounts[itemIndex]!
      itemDiscounts[itemIndex] += calculateDiscount(
        remaining,
        currency,
        discount
      )
      continue
    }

    const remaining =
      subtotalAmount -
      itemDiscounts.reduce((sum, amount) => sum + amount, 0n) -
      transactionDiscountAmount
    if (remaining === 0n) break
    transactionDiscountAmount += calculateDiscount(
      remaining,
      currency,
      discount
    )
  }
  const discountAmount =
    itemDiscounts.reduce((sum, amount) => sum + amount, 0n) +
    transactionDiscountAmount

  const taxRate = await prisma.taxRate.findFirst({
    where: {
      tenantId,
      isDefault: true,
      isActive: true,
      OR: [
        { startsAt: null },
        { startsAt: { lte: subscription.currentPeriodStart ?? asOf } },
      ],
    },
    orderBy: { startsAt: 'desc' },
  })
  const chargeLines = calculateInvoiceChargeLines(
    [
      ...recurring.map(({ item }, index) => ({
        subtotalAmount: lineSubtotals[index]! - itemDiscounts[index]!,
        taxable:
          item.price.isTaxable ||
          Boolean(item.price.item?.isTaxable) ||
          Boolean(item.price.plan?.isTaxable) ||
          Boolean(item.price.addon?.isTaxable),
      })),
      ...subscription.charges.map((charge, index) => {
        const lineIndex = recurring.length + index

        return {
          subtotalAmount: lineSubtotals[lineIndex]! - itemDiscounts[lineIndex]!,
          taxable: charge.isTaxable,
        }
      }),
    ],
    transactionDiscountAmount,
    taxRate
      ? { ...taxRate, inclusive: subscription.taxBehavior === 'INCLUSIVE' }
      : null
  )
  const taxAmount = chargeLines.reduce((sum, line) => sum + line.taxAmount, 0n)
  const totalAmount = chargeLines.reduce(
    (sum, line) => sum + line.totalAmount,
    0n
  )

  return {
    object: 'upcoming_invoice' as const,
    subscriptionId,
    customer: {
      object: 'customer' as const,
      id: subscription.customer.id,
      name: subscription.customer.name,
    },
    currency,
    scheduledFor: subscription.nextBillingAt,
    servicePeriodStart: subscription.currentPeriodStart,
    servicePeriodEnd: subscription.currentPeriodEnd,
    subtotalAmount: subtotalAmount.toString(),
    discountAmount: discountAmount.toString(),
    taxAmount: taxAmount.toString(),
    totalAmount: totalAmount.toString(),
    lines: [
      ...recurring.map(({ item, unitAmount }, index) => ({
        object: 'upcoming_invoice_line' as const,
        kind: 'RECURRING' as const,
        subscriptionItemId: item.id,
        subscriptionChargeId: null,
        priceId: item.priceId,
        description:
          item.description ??
          item.price.plan?.name ??
          item.price.addon?.name ??
          item.price.item?.name ??
          item.price.nickname ??
          'Subscription charge',
        quantity: item.quantity,
        unitAmount: (unitAmount ?? 0n).toString(),
        discountAmount: (
          (chargeLines[index]?.discountAmount ?? 0n) + itemDiscounts[index]!
        ).toString(),
        taxAmount: (chargeLines[index]?.taxAmount ?? 0n).toString(),
        totalAmount: (chargeLines[index]?.totalAmount ?? 0n).toString(),
      })),
      ...subscription.charges.map((charge, index) => {
        const lineIndex = recurring.length + index

        return {
          object: 'upcoming_invoice_line' as const,
          kind: 'ONE_TIME' as const,
          subscriptionItemId: null,
          subscriptionChargeId: charge.id,
          priceId: charge.priceId,
          description: charge.description,
          quantity: charge.quantity,
          unitAmount: charge.unitAmount.toString(),
          discountAmount: (
            (chargeLines[lineIndex]?.discountAmount ?? 0n) +
            itemDiscounts[lineIndex]!
          ).toString(),
          taxAmount: (chargeLines[lineIndex]?.taxAmount ?? 0n).toString(),
          totalAmount: (chargeLines[lineIndex]?.totalAmount ?? 0n).toString(),
        }
      }),
    ],
  }
}
