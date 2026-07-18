import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type { ServiceResult } from '@/types/api'
import type { SubscriptionDiscountCreateParams } from '@/types/subscription'

import { err, ok } from '../result'
import {
  isPromotionCodeEligible,
  lockPromotionRedemption,
  PromotionRedemptionConflict,
  resolveCouponAmount,
} from './promotion-eligibility'

export async function createDiscount(
  tenantId: string,
  subscriptionId: string,
  params: SubscriptionDiscountCreateParams,
  actorUserId?: string
): ServiceResult<{ id: string }> {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, tenantId, deletedAt: null },
    include: {
      items: {
        where: { isActive: true },
        include: { price: { include: { plan: true, addon: true } } },
      },
    },
  })
  if (!subscription) return err('The subscription was not found.', 404)
  if (!['ACTIVE', 'TRIALING', 'DRAFT'].includes(subscription.status))
    return err('Discounts cannot be changed for this subscription.', 409)

  const currency = subscription.items.find((item) => item.currency)?.currency
  if (!currency)
    return err('The subscription does not have a billing currency.', 409)
  if (params.currency && params.currency !== currency)
    return err('The discount must use the subscription currency.', 422)
  if (
    params.subscriptionItemId &&
    !subscription.items.some((item) => item.id === params.subscriptionItemId)
  )
    return err('The selected subscription item was not found.', 404)

  const planItem = subscription.items.find((item) => item.price.plan)
  if (!planItem?.price.planId || !planItem.price.plan)
    return err('The subscription does not have an active plan.', 409)
  const promotionCode = params.promotionCode
    ? await prisma.promotionCode.findFirst({
        where: {
          tenantId,
          code: params.promotionCode.toUpperCase(),
          isActive: true,
        },
        include: {
          coupon: {
            include: {
              currencyAmounts: true,
              planApplicabilities: true,
              addonApplicabilities: true,
              customerEligibilities: true,
            },
          },
        },
      })
    : null
  if (params.promotionCode && !promotionCode)
    return err('The promotion code is invalid or inactive.', 422)

  const now = nowUnixSeconds()
  if (
    promotionCode &&
    !(await isPromotionCodeEligible({
      tenantId,
      promotionCode,
      customerId: subscription.customerId,
      productId: planItem.price.plan.productId,
      planId: planItem.price.planId,
      addonIds: subscription.items.flatMap((item) =>
        item.price.addonId ? [item.price.addonId] : []
      ),
      currency,
      now,
    }))
  )
    return err('The promotion code is not eligible for this subscription.', 422)

  const discountId = generateId('SubscriptionDiscount')
  try {
    await prisma.$transaction(async (tx) => {
      if (promotionCode)
        await lockPromotionRedemption(
          tx,
          tenantId,
          promotionCode,
          subscription.customerId,
          now
        )

      const coupon = promotionCode?.coupon
      const duration = coupon?.duration ?? params.duration
      await tx.subscriptionDiscount.create({
        data: {
          id: discountId,
          tenantId,
          subscriptionId,
          couponId: coupon?.id ?? null,
          promotionCodeId: promotionCode?.id ?? null,
          subscriptionItemId: params.subscriptionItemId ?? null,
          source: coupon ? 'COUPON' : 'MANUAL',
          scope: params.scope,
          status: 'ACTIVE',
          discountType: coupon?.discountType ?? params.discountType!,
          percentOff: coupon?.percentOff ?? params.percentOff ?? null,
          amountOff:
            resolveCouponAmount(promotionCode, currency) ??
            params.amountOff ??
            null,
          currency: coupon?.currency ?? params.currency ?? null,
          duration,
          remainingCycles:
            duration === 'ONCE'
              ? 1
              : duration === 'REPEATING'
                ? (coupon?.durationInCycles ?? params.durationInCycles ?? null)
                : null,
          grantedByUserId: actorUserId ?? null,
          grantReason: params.reason ?? null,
          startsAt: params.startsAt ?? now,
          createdAt: now,
          updatedAt: now,
        },
      })
      if (promotionCode)
        await tx.couponRedemption.create({
          data: {
            id: generateId('CouponRedemption'),
            tenantId,
            couponId: promotionCode.coupon.id,
            promotionCodeId: promotionCode.id,
            customerId: subscription.customerId,
            subscriptionId,
            currency,
            redeemedAt: now,
          },
        })
      await tx.subscriptionEvent.create({
        data: {
          id: generateId('SubscriptionEvent'),
          subscriptionId,
          type: 'COUPON_APPLIED',
          actorUserId: actorUserId ?? null,
          details: {
            discountId,
            promotionCodeId: promotionCode?.id ?? null,
            source: coupon ? 'COUPON' : 'MANUAL',
          },
          occurredAt: now,
        },
      })
    })

    return ok({ id: discountId })
  } catch (error) {
    if (error instanceof PromotionRedemptionConflict)
      return err(
        'The promotion code reached a redemption limit or is no longer active.',
        422
      )
    console.error('[billing.service.subscriptions.discounts.create]', error)
    return err('Failed to apply the subscription discount.', 500)
  }
}

export function listDiscounts(tenantId: string, subscriptionId: string) {
  return prisma.subscriptionDiscount.findMany({
    where: { tenantId, subscriptionId },
    include: { coupon: true, promotionCode: true, subscriptionItem: true },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  })
}

export async function removeDiscount(
  tenantId: string,
  subscriptionId: string,
  discountId: string,
  actorUserId?: string
): ServiceResult<{ id: string }> {
  const now = nowUnixSeconds()
  const updated = await prisma.subscriptionDiscount.updateMany({
    where: {
      id: discountId,
      tenantId,
      subscriptionId,
      status: 'ACTIVE',
    },
    data: { status: 'EXHAUSTED', endsAt: now, updatedAt: now },
  })
  if (updated.count === 0)
    return err('The active subscription discount was not found.', 404)
  await prisma.subscriptionEvent.create({
    data: {
      id: generateId('SubscriptionEvent'),
      subscriptionId,
      type: 'UPDATED',
      actorUserId: actorUserId ?? null,
      details: { discountId, discountRemoved: true },
      occurredAt: now,
    },
  })

  return ok({ id: discountId })
}
