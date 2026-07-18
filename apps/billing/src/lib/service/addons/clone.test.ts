import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { cloneAddon } from './clone'

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

const sourceAddon = {
  id: 'addon_source',
  productId: 'prod_123',
  description: 'Extra storage',
  imageUrl: null,
  type: 'SERVICE',
  priceType: 'RECURRING',
  intervalUnit: 'MONTH',
  intervalCount: 1,
  unitName: 'gigabyte',
  taxCode: null,
  isTaxable: false,
  showInCheckout: true,
  allowPortalManagement: true,
  metadata: { family: 'storage' },
  prices: [
    {
      id: 'price_original',
      nickname: 'Monthly',
      entitlementReferenceId: 'ent_original',
      currency: 'JMD',
      unitAmount: 500n,
      pricingModel: 'PER_UNIT',
      priceType: 'RECURRING',
      intervalUnit: 'MONTH',
      intervalCount: 1,
      unitName: 'gigabyte',
      packageSize: null,
      isTaxable: false,
      isActive: true,
      metadata: null,
      tiers: [],
    },
  ],
  planAssociations: [
    {
      id: 'assoc_original',
      planId: 'plan_123',
      associationType: 'RECOMMENDED',
      events: ['PLAN_CHANGE'],
      frequency: 'FIRST_OCCURRENCE',
      isActive: true,
    },
  ],
}

describe('cloneAddon', () => {
  beforeEach(() => {
    mocks.prismaRef.current = {
      addon: {
        findFirst: vi.fn().mockResolvedValue(sourceAddon),
        create: vi.fn().mockResolvedValue({ id: 'addon_clone' }),
      },
    }
    mocks.generateId.mockImplementation((model: string) => {
      const ids: Record<string, string> = {
        Addon: 'addon_clone',
        Price: 'price_clone',
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

  it('clones immutable prices and plan availability with fresh identities', async () => {
    const addon = (
      mocks.prismaRef.current as unknown as {
        addon: { create: ReturnType<typeof vi.fn> }
      }
    ).addon

    const result = await cloneAddon('ten_123', 'addon_source', {
      code: 'extra-storage-copy',
      name: 'Extra Storage Copy',
    })

    expect(result).toEqual({ data: { id: 'addon_clone' }, error: null })
    expect(addon.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'addon_clone',
        tenantId: 'ten_123',
        code: 'extra-storage-copy',
        name: 'Extra Storage Copy',
        isActive: true,
        prices: {
          create: [
            expect.objectContaining({
              id: 'price_clone',
              entitlementReferenceId: null,
            }),
          ],
        },
        planAssociations: {
          create: [
            expect.objectContaining({
              id: 'assoc_clone',
              planId: 'plan_123',
              associationType: 'RECOMMENDED',
            }),
          ],
        },
      }),
    })
  })

  it('returns a conflict for a duplicate clone code', async () => {
    const addon = (
      mocks.prismaRef.current as unknown as {
        addon: { create: ReturnType<typeof vi.fn> }
      }
    ).addon
    addon.create.mockRejectedValue({ code: 'P2002' })

    const result = await cloneAddon('ten_123', 'addon_source', {
      code: 'extra-storage-copy',
      name: 'Extra Storage Copy',
    })

    expect(result).toEqual({
      data: null,
      error: 'An add-on with this code already exists.',
      status: 409,
    })
  })
})
