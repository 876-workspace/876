import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { upsertAssociations } from './associations'

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

const associations = [
  {
    planId: 'plan_1',
    associationType: 'OPTIONAL' as const,
    events: ['SUBSCRIPTION_ACTIVATION' as const],
    frequency: 'EVERY_OCCURRENCE' as const,
    isActive: true,
  },
  {
    planId: 'plan_2',
    associationType: 'MANDATORY' as const,
    events: ['PLAN_CHANGE' as const],
    frequency: 'FIRST_OCCURRENCE' as const,
    isActive: false,
  },
]

describe('upsertAssociations', () => {
  beforeEach(() => {
    const upsert = vi.fn(({ create }) => Promise.resolve({ id: create.id }))
    mocks.prismaRef.current = {
      addon: {
        findFirst: vi.fn().mockResolvedValue({
          productId: 'prod_1',
          priceType: 'RECURRING',
          intervalUnit: 'MONTH',
          intervalCount: 1,
        }),
      },
      plan: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'plan_1',
            productId: 'prod_1',
            intervalUnit: 'MONTH',
            intervalCount: 1,
          },
          {
            id: 'plan_2',
            productId: 'prod_1',
            intervalUnit: 'MONTH',
            intervalCount: 1,
          },
        ]),
      },
      planAddonAssociation: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ id: 'assoc_existing', planId: 'plan_1' }]),
        upsert,
      },
      $transaction: vi.fn((operations: Promise<unknown>[]) =>
        Promise.all(operations)
      ),
    }
    mocks.generateId.mockReturnValue('assoc_new')
    mocks.nowUnixSeconds.mockReturnValue(1_783_771_200)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('commits all changed plan rules in one transaction', async () => {
    const prisma = mocks.prismaRef.current as unknown as {
      planAddonAssociation: { upsert: ReturnType<typeof vi.fn> }
      $transaction: ReturnType<typeof vi.fn>
    }

    const result = await upsertAssociations('ten_1', 'addon_1', associations)

    expect(result).toEqual({
      data: { ids: ['assoc_existing', 'assoc_new'] },
      error: null,
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(prisma.planAddonAssociation.upsert).toHaveBeenCalledTimes(2)
    expect(prisma.planAddonAssociation.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        create: expect.objectContaining({
          id: 'assoc_existing',
          planId: 'plan_1',
        }),
      })
    )
    expect(prisma.planAddonAssociation.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        create: expect.objectContaining({ id: 'assoc_new', planId: 'plan_2' }),
      })
    )
  })

  it('rejects duplicate plan mutations before touching the database', async () => {
    const prisma = mocks.prismaRef.current as unknown as {
      $transaction: ReturnType<typeof vi.fn>
    }

    const result = await upsertAssociations('ten_1', 'addon_1', [
      associations[0]!,
      associations[0]!,
    ])

    expect(result).toEqual({
      data: null,
      error: 'Each plan can appear only once.',
      status: 422,
    })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
