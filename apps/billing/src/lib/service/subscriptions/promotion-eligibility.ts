import { prisma } from '@/lib/db'

type Applicability = {
  planId?: string
  addonId?: string
  customerId?: string
}

export type PromotionCodeForSubscription = {
  id: string
  customerId: string | null
  expiresAt: number | null
  maxRedemptions: number | null
  timesRedeemed: number
  coupon: {
    id: string
    productId: string | null
    discountType: 'PERCENTAGE' | 'AMOUNT'
    amountOff: bigint | null
    currency: string | null
    isActive: boolean
    redeemBy: number | null
    maxRedemptions: number | null
    timesRedeemed: number
    maxRedemptionsPerCustomer: number | null
    eligibleForAllCustomers: boolean
    appliesToAllPlans: boolean
    appliesToAllRecurringAddons: boolean
    currencyAmounts: Array<{ currency: string; amountOff: bigint }>
    planApplicabilities: Applicability[]
    addonApplicabilities: Applicability[]
    customerEligibilities: Applicability[]
  }
}

export class PromotionRedemptionConflict extends Error {}

type PromotionTransaction = Pick<
  typeof prisma,
  'coupon' | 'couponRedemption' | 'promotionCode'
>

export async function isPromotionCodeEligible({
  tenantId,
  promotionCode,
  customerId,
  productId,
  planId,
  addonIds,
  currency,
  now,
}: {
  tenantId: string
  promotionCode: PromotionCodeForSubscription
  customerId: string
  productId: string
  planId: string
  addonIds: string[]
  currency: string | undefined
  now: number
}) {
  const coupon = promotionCode.coupon
  const exhausted =
    (promotionCode.maxRedemptions !== null &&
      promotionCode.timesRedeemed >= promotionCode.maxRedemptions) ||
    (coupon.maxRedemptions !== null &&
      coupon.timesRedeemed >= coupon.maxRedemptions)
  const expired =
    (promotionCode.expiresAt !== null && promotionCode.expiresAt <= now) ||
    (coupon.redeemBy !== null && coupon.redeemBy <= now)
  const eligibleCustomer =
    coupon.eligibleForAllCustomers ||
    coupon.customerEligibilities.some(
      (eligibility) => eligibility.customerId === customerId
    )
  const eligiblePlan =
    coupon.appliesToAllPlans ||
    coupon.planApplicabilities.some(
      (applicability) => applicability.planId === planId
    )
  const eligibleAddon = addonIds.some(
    (addonId) =>
      coupon.appliesToAllRecurringAddons ||
      coupon.addonApplicabilities.some(
        (applicability) => applicability.addonId === addonId
      )
  )
  const currencyAmount = coupon.currencyAmounts.some(
    (entry) => entry.currency === currency
  )
  const wrongCurrency =
    coupon.discountType === 'AMOUNT' &&
    !currencyAmount &&
    (coupon.currency === null || coupon.currency !== currency)
  const customerRedemptions = coupon.maxRedemptionsPerCustomer
    ? await prisma.couponRedemption.count({
        where: { tenantId, couponId: coupon.id, customerId },
      })
    : 0

  return !(
    !coupon.isActive ||
    exhausted ||
    expired ||
    (promotionCode.customerId !== null &&
      promotionCode.customerId !== customerId) ||
    (coupon.productId !== null && coupon.productId !== productId) ||
    !eligibleCustomer ||
    (!eligiblePlan && !eligibleAddon) ||
    wrongCurrency ||
    (coupon.maxRedemptionsPerCustomer !== null &&
      customerRedemptions >= coupon.maxRedemptionsPerCustomer)
  )
}

/** Serializes redemption counters before a subscription consumes the code. */
export async function lockPromotionRedemption(
  tx: PromotionTransaction,
  tenantId: string,
  promotionCode: PromotionCodeForSubscription,
  customerId: string,
  now: number
) {
  const couponLock = await tx.coupon.updateMany({
    where: { id: promotionCode.coupon.id, tenantId, isActive: true },
    data: { timesRedeemed: { increment: 1 }, updatedAt: now },
  })
  const promotionCodeLock = await tx.promotionCode.updateMany({
    where: { id: promotionCode.id, tenantId, isActive: true },
    data: { timesRedeemed: { increment: 1 }, updatedAt: now },
  })
  if (couponLock.count !== 1 || promotionCodeLock.count !== 1)
    throw new PromotionRedemptionConflict()

  const [currentCoupon, currentPromotionCode, customerRedemptions] =
    await Promise.all([
      tx.coupon.findUnique({
        where: { id: promotionCode.coupon.id },
        select: {
          timesRedeemed: true,
          maxRedemptions: true,
          maxRedemptionsPerCustomer: true,
          redeemBy: true,
        },
      }),
      tx.promotionCode.findUnique({
        where: { id: promotionCode.id },
        select: {
          timesRedeemed: true,
          maxRedemptions: true,
          expiresAt: true,
        },
      }),
      tx.couponRedemption.count({
        where: {
          tenantId,
          couponId: promotionCode.coupon.id,
          customerId,
        },
      }),
    ])
  if (
    !currentCoupon ||
    !currentPromotionCode ||
    (currentCoupon.maxRedemptions !== null &&
      currentCoupon.timesRedeemed > currentCoupon.maxRedemptions) ||
    (currentPromotionCode.maxRedemptions !== null &&
      currentPromotionCode.timesRedeemed >
        currentPromotionCode.maxRedemptions) ||
    (currentCoupon.redeemBy !== null && currentCoupon.redeemBy <= now) ||
    (currentPromotionCode.expiresAt !== null &&
      currentPromotionCode.expiresAt <= now) ||
    (currentCoupon.maxRedemptionsPerCustomer !== null &&
      customerRedemptions >= currentCoupon.maxRedemptionsPerCustomer)
  )
    throw new PromotionRedemptionConflict()
}

export function resolveCouponAmount(
  promotionCode: PromotionCodeForSubscription | null,
  currency: string | undefined
) {
  if (!promotionCode) return null
  return (
    promotionCode.coupon.currencyAmounts.find(
      (entry) => entry.currency === currency
    )?.amountOff ?? promotionCode.coupon.amountOff
  )
}
