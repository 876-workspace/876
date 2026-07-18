import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clonePlan } from './clone'

const mocks = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
  generateId: vi.fn(),
  nowUnixSeconds: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mocks.prismaRef.current
  },
}))
vi.mock('@/lib/id', () => ({ generateId: mocks.generateId }))
vi.mock('@876/core/timestamps', () => ({
  nowUnixSeconds: mocks.nowUnixSeconds,
}))

const sourcePlan = {
  id: 'plan_source',
  productId: 'prod_123',
  description: 'Original plan',
  imageUrl: 'https://example.com/plan.png',
  unitName: 'seat',
  taxCode: 'SERVICES',
  entitlementReferenceId: 'ent_original',
  intervalUnit: 'MONTH',
  intervalCount: 1,
  billingCycleCount: 12,
  trialDays: 14,
  setupFeeAmount: 2_500n,
  setupFeeCurrency: 'JMD',
  isTaxable: true,
  isFree: false,
  showInCheckout: true,
  metadata: { segment: 'business' },
  prices: [
    {
      id: 'price_original',
      nickname: 'Monthly',
      entitlementReferenceId: 'ent_price_original',
      currency: 'JMD',
      unitAmount: null,
      pricingModel: 'TIERED',
      priceType: 'RECURRING',
      intervalUnit: 'MONTH',
      intervalCount: 1,
      unitName: 'seat',
      packageSize: null,
      isTaxable: true,
      isActive: true,
      metadata: { channel: 'direct' },
      tiers: [
        {
          id: 'tier_original',
          fromUnit: 1,
          toUnit: null,
          unitAmount: 1_000n,
          flatAmount: null,
        },
      ],
    },
  ],
  addonAssociations: [
    {
      id: 'assoc_original',
      addonId: 'addon_123',
      associationType: 'MANDATORY',
      events: ['SUBSCRIPTION_ACTIVATION'],
      frequency: 'EVERY_OCCURRENCE',
      isActive: true,
    },
  ],
}

describe('clonePlan', () => {
  beforeEach(() => {
    mocks.prismaRef.current = {
      plan: {
        findFirst: vi.fn().mockResolvedValue(sourcePlan),
        create: vi.fn().mockResolvedValue({ id: 'plan_clone' }),
      },
    }
    mocks.generateId.mockImplementation((model: string) => {
      const ids: Record<string, string> = {
        Plan: 'plan_clone',
        Price: 'price_clone',
        PriceTier: 'tier_clone',
        PlanAddonAssociation: 'assoc_clone',
      }
      return ids[model]
    })
    mocks.nowUnixSeconds.mockReturnValue(1_783_771_200)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('issues fresh identities while preserving catalog terms and availability', async () => {
    const plan = (
      mocks.prismaRef.current as unknown as {
        plan: { create: ReturnType<typeof vi.fn> }
      }
    ).plan

    const result = await clonePlan('ten_123', 'plan_source', {
      code: 'business-copy',
      name: 'Business Copy',
    })

    expect(result).toEqual({ data: { id: 'plan_clone' }, error: null })
    expect(plan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'plan_clone',
        tenantId: 'ten_123',
        productId: 'prod_123',
        code: 'business-copy',
        name: 'Business Copy',
        entitlementReferenceId: null,
        isActive: true,
        prices: {
          create: [
            expect.objectContaining({
              id: 'price_clone',
              entitlementReferenceId: null,
              tiers: {
                create: [expect.objectContaining({ id: 'tier_clone' })],
              },
            }),
          ],
        },
        addonAssociations: {
          create: [
            expect.objectContaining({
              id: 'assoc_clone',
              addonId: 'addon_123',
              associationType: 'MANDATORY',
            }),
          ],
        },
      }),
    })
  })

  it('returns a conflict for a duplicate clone code', async () => {
    const plan = (
      mocks.prismaRef.current as unknown as {
        plan: { create: ReturnType<typeof vi.fn> }
      }
    ).plan
    plan.create.mockRejectedValue({ code: 'P2002' })

    const result = await clonePlan('ten_123', 'plan_source', {
      code: 'business-copy',
      name: 'Business Copy',
    })

    expect(result).toEqual({
      data: null,
      error: 'A plan with this code already exists.',
      status: 409,
    })
  })
})
