import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  isPromotionCodeEligible,
  resolveCouponAmount,
  type PromotionCodeForSubscription,
} from './promotion-eligibility'

const mocks = vi.hoisted(() => ({ count: vi.fn() }))

vi.mock('@/lib/db', () => ({
  prisma: { couponRedemption: { count: mocks.count } },
}))

function promotion(
  overrides: Partial<PromotionCodeForSubscription['coupon']> = {}
): PromotionCodeForSubscription {
  return {
    id: 'promo_1',
    customerId: null,
    expiresAt: null,
    maxRedemptions: null,
    timesRedeemed: 0,
    coupon: {
      id: 'coupon_1',
      productId: 'prod_1',
      discountType: 'AMOUNT',
      amountOff: 500n,
      currency: 'JMD',
      isActive: true,
      redeemBy: null,
      maxRedemptions: null,
      timesRedeemed: 0,
      maxRedemptionsPerCustomer: null,
      eligibleForAllCustomers: true,
      appliesToAllPlans: true,
      appliesToAllRecurringAddons: true,
      currencyAmounts: [{ currency: 'USD', amountOff: 250n }],
      planApplicabilities: [],
      addonApplicabilities: [],
      customerEligibilities: [],
      ...overrides,
    },
  }
}

function eligibilityInput(promotionCode: PromotionCodeForSubscription) {
  return {
    tenantId: 'ten_1',
    promotionCode,
    customerId: 'cus_1',
    productId: 'prod_1',
    planId: 'plan_1',
    addonIds: [] as string[],
    currency: 'JMD',
    now: 1_783_771_200,
  }
}

describe('subscription promotion eligibility', () => {
  beforeEach(() => {
    mocks.count.mockResolvedValue(0)
    vi.clearAllMocks()
  })

  it('accepts base and currency-specific fixed discounts', async () => {
    const code = promotion()

    await expect(isPromotionCodeEligible(eligibilityInput(code))).resolves.toBe(
      true
    )
    expect(resolveCouponAmount(code, 'JMD')).toBe(500n)
    expect(resolveCouponAmount(code, 'USD')).toBe(250n)
  })

  it('enforces product, customer, and plan targeting', async () => {
    const code = promotion({
      eligibleForAllCustomers: false,
      appliesToAllPlans: false,
      customerEligibilities: [{ customerId: 'cus_2' }],
      planApplicabilities: [{ planId: 'plan_2' }],
    })

    await expect(isPromotionCodeEligible(eligibilityInput(code))).resolves.toBe(
      false
    )
  })

  it('enforces the per-customer redemption limit', async () => {
    const code = promotion({ maxRedemptionsPerCustomer: 1 })
    mocks.count.mockResolvedValue(1)

    await expect(isPromotionCodeEligible(eligibilityInput(code))).resolves.toBe(
      false
    )
    expect(mocks.count).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', couponId: 'coupon_1', customerId: 'cus_1' },
    })
  })
})
