import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prisma: {
    subscription: { findFirst: vi.fn() },
    addon: { findFirst: vi.fn() },
    price: { findFirst: vi.fn() },
  },
}))

vi.mock('@/lib/db', () => ({ prisma: mocks.prisma }))

import { createCharge } from './charges'

const params = {
  addonId: 'addon_1',
  priceId: 'price_1',
  description: 'Priority support',
  quantity: 1,
  unitAmount: 5_000n,
  currency: 'JMD',
  taxBehavior: 'EXCLUSIVE' as const,
  isTaxable: true,
  invoiceBehavior: 'NEXT_INVOICE' as const,
  serviceAt: null,
}

describe('subscription one-time charges', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.prisma.subscription.findFirst.mockResolvedValue({
      id: 'sub_1',
      customerId: 'cus_1',
      status: 'ACTIVE',
      taxBehavior: 'EXCLUSIVE',
      items: [{ currency: 'JMD', price: { planId: 'plan_1' } }],
    })
    mocks.prisma.addon.findFirst.mockResolvedValue({
      id: 'addon_1',
      planAssociations: [{ planId: 'plan_1' }],
    })
  })

  it('rejects recurring prices used as one-time charges', async () => {
    mocks.prisma.price.findFirst.mockResolvedValue({
      id: 'price_1',
      addonId: 'addon_1',
      currency: 'JMD',
      priceType: 'RECURRING',
      addon: { planAssociations: [{ planId: 'plan_1' }] },
    })

    const result = await createCharge('ten_1', 'sub_1', params)

    expect(result.data).toBeNull()
    expect(result.error).toBe('Subscription charges require a one-time price.')
    expect((result as { status?: number }).status).toBe(422)
  })

  it('rejects one-time add-ons that are unavailable for the plan', async () => {
    mocks.prisma.addon.findFirst.mockResolvedValue({
      id: 'addon_1',
      planAssociations: [{ planId: 'plan_other' }],
    })
    mocks.prisma.price.findFirst.mockResolvedValue({
      id: 'price_1',
      addonId: 'addon_1',
      currency: 'JMD',
      priceType: 'ONE_TIME',
      addon: { planAssociations: [{ planId: 'plan_other' }] },
    })

    const result = await createCharge('ten_1', 'sub_1', params)

    expect(result.data).toBeNull()
    expect(result.error).toBe(
      'The selected add-on is not available for this plan.'
    )
    expect((result as { status?: number }).status).toBe(422)
  })
})
