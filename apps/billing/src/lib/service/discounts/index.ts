import { nowUnixSeconds } from '@876/core/timestamps'

import { prisma } from '@/lib/db'
import { generateId } from '@/lib/id'
import type {
  CouponCreateParams,
  CouponUpdateParams,
  PromotionCodeCreateParams,
} from '@/types/discount'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'
import { hasEnabledCurrency, isUniqueConstraintError } from '../shared'

async function createCoupon(
  tenantId: string,
  params: CouponCreateParams
): ServiceResult<{ id: string }> {
  let product: { id: string } | null = null
  if (params.productId) {
    product = await prisma.product.findFirst({
      where: { id: params.productId, tenantId },
      select: { id: true },
    })
    if (!product) return err('Product not found.', 404)
  }

  const currencies = [
    ...(params.currency ? [params.currency] : []),
    ...params.currencyAmounts.map((entry) => entry.currency),
  ]
  const enabled = await Promise.all(
    [...new Set(currencies)].map((currency) =>
      hasEnabledCurrency(tenantId, currency)
    )
  )
  if (enabled.some((value) => !value))
    return err('Enable every coupon currency before using it.', 422)

  const [plans, addons, customers] = await Promise.all([
    params.planIds.length
      ? prisma.plan.findMany({
          where: {
            tenantId,
            id: { in: params.planIds },
            ...(product ? { productId: product.id } : {}),
          },
          select: { id: true },
        })
      : [],
    params.addonIds.length
      ? prisma.addon.findMany({
          where: {
            tenantId,
            id: { in: params.addonIds },
            ...(product ? { productId: product.id } : {}),
          },
          select: { id: true },
        })
      : [],
    params.customerIds.length
      ? prisma.customer.findMany({
          where: { tenantId, id: { in: params.customerIds } },
          select: { id: true },
        })
      : [],
  ])
  if (plans.length !== new Set(params.planIds).size)
    return err('One or more selected plans were not found.', 422)
  if (addons.length !== new Set(params.addonIds).size)
    return err('One or more selected add-ons were not found.', 422)
  if (customers.length !== new Set(params.customerIds).size)
    return err('One or more eligible customers were not found.', 422)

  try {
    const now = nowUnixSeconds()
    const coupon = await prisma.coupon.create({
      data: {
        id: generateId('Coupon'),
        tenantId,
        productId: product?.id ?? null,
        name: params.name,
        discountType:
          params.percentOff !== null && params.percentOff !== undefined
            ? 'PERCENTAGE'
            : 'AMOUNT',
        percentOff: params.percentOff ?? null,
        amountOff: params.amountOff ?? null,
        currency: params.currency ?? null,
        duration: params.duration,
        durationInCycles: params.durationInCycles ?? null,
        discountPreference: params.discountPreference,
        appliesToAllPlans: params.appliesToAllPlans,
        appliesToAllRecurringAddons: params.appliesToAllRecurringAddons,
        appliesToAllOneTimeAddons: params.appliesToAllOneTimeAddons,
        eligibleForAllCustomers: params.eligibleForAllCustomers,
        maxRedemptionsPerCustomer: params.maxRedemptionsPerCustomer ?? null,
        redeemBy: params.redeemBy ?? null,
        maxRedemptions: params.maxRedemptions ?? null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        currencyAmounts: {
          create: params.currencyAmounts.map((entry) => ({
            id: generateId('CouponCurrencyAmount'),
            tenantId,
            currency: entry.currency,
            amountOff: entry.amountOff,
            createdAt: now,
            updatedAt: now,
          })),
        },
        planApplicabilities: {
          create: params.planIds.map((planId) => ({
            id: generateId('CouponPlanApplicability'),
            tenantId,
            planId,
            createdAt: now,
          })),
        },
        addonApplicabilities: {
          create: params.addonIds.map((addonId) => ({
            id: generateId('CouponAddonApplicability'),
            tenantId,
            addonId,
            createdAt: now,
          })),
        },
        customerEligibilities: {
          create: params.customerIds.map((customerId) => ({
            id: generateId('CouponCustomerEligibility'),
            tenantId,
            customerId,
            createdAt: now,
          })),
        },
        promotionCodes: params.code
          ? {
              create: {
                id: generateId('PromotionCode'),
                code: params.code,
                isActive: true,
                createdAt: now,
                updatedAt: now,
                tenant: { connect: { id: tenantId } },
              },
            }
          : undefined,
      },
    })

    return ok({ id: coupon.id })
  } catch (error) {
    if (isUniqueConstraintError(error))
      return err('Coupon applicability contains duplicate values.', 409)
    console.error('[billing.service.discounts.coupons.create]', error)
    return err('Failed to create the coupon.', 500)
  }
}

async function updateCoupon(
  tenantId: string,
  couponId: string,
  params: CouponUpdateParams
): ServiceResult<{ id: string }> {
  if (Object.keys(params).length === 0) return err('Nothing to update.', 422)
  const result = await prisma.coupon.updateMany({
    where: { id: couponId, tenantId },
    data: { ...params, updatedAt: nowUnixSeconds() },
  })
  if (result.count === 0) return err('Coupon not found.', 404)
  return ok({ id: couponId })
}

async function deleteCoupon(
  tenantId: string,
  couponId: string
): ServiceResult<{ id: string }> {
  const coupon = await prisma.coupon.findFirst({
    where: { id: couponId, tenantId },
    include: { _count: { select: { discounts: true, redemptions: true } } },
  })
  if (!coupon) return err('Coupon not found.', 404)
  if (coupon._count.discounts || coupon._count.redemptions)
    return err('This coupon has redemption history. Archive it instead.', 409)
  await prisma.coupon.delete({ where: { id: couponId } })
  return ok({ id: couponId })
}

async function createPromotionCode(
  tenantId: string,
  params: PromotionCodeCreateParams
): ServiceResult<{ id: string }> {
  const coupon = await prisma.coupon.findFirst({
    where: { id: params.couponId, tenantId, isActive: true },
  })
  if (!coupon) return err('Active coupon not found.', 404)
  if (params.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: params.customerId, tenantId, status: 'ACTIVE' },
      select: { id: true },
    })
    if (!customer) return err('Customer not found.', 404)
  }

  const now = nowUnixSeconds()
  const promotionCode = await prisma.promotionCode.create({
    data: {
      id: generateId('PromotionCode'),
      tenantId,
      couponId: coupon.id,
      code: params.code,
      customerId: params.customerId ?? null,
      expiresAt: params.expiresAt ?? null,
      maxRedemptions: params.maxRedemptions ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  })

  return ok({ id: promotionCode.id })
}

export const discounts = {
  coupons: {
    create: createCoupon,
    update: updateCoupon,
    delete: deleteCoupon,
    retrieve(tenantId: string, couponId: string) {
      return prisma.coupon.findFirst({
        where: { id: couponId, tenantId },
        include: {
          product: true,
          promotionCodes: true,
          currencyAmounts: true,
          planApplicabilities: { include: { plan: true } },
          addonApplicabilities: { include: { addon: true } },
          customerEligibilities: { include: { customer: true } },
          redemptions: {
            include: { customer: true, promotionCode: true },
            orderBy: { redeemedAt: 'desc' },
          },
        },
      })
    },
    list(tenantId: string, isActive?: boolean) {
      return prisma.coupon.findMany({
        where: {
          tenantId,
          ...(isActive !== undefined ? { isActive } : {}),
        },
        include: {
          product: true,
          promotionCodes: true,
          currencyAmounts: true,
          planApplicabilities: true,
          addonApplicabilities: true,
          customerEligibilities: true,
          redemptions: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    },
  },
  promotionCodes: {
    create: createPromotionCode,
    list(tenantId: string) {
      return prisma.promotionCode.findMany({
        where: { tenantId },
        include: { coupon: true },
        orderBy: { createdAt: 'desc' },
      })
    },
  },
}
