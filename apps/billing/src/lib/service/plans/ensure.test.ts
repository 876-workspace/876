import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ensure } from './ensure'

const { mockPrismaRef } = vi.hoisted(() => ({
  mockPrismaRef: { current: null as unknown as Record<string, unknown> },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))

function createParams(overrides = {}) {
  return {
    productId: 'blprod_1',
    entitlementReferenceId: 'prd_core1',
    code: '876-couriers-pro',
    name: 'Pro',
    description: null,
    intervalUnit: 'MONTH' as const,
    intervalCount: 1,
    trialDays: 0,
    active: true,
    ...overrides,
  }
}

describe('ensure', () => {
  beforeEach(() => {
    mockPrismaRef.current = {
      plan: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({ id: 'blplan_updated' }),
      },
      product: { findFirst: vi.fn() },
    } as unknown as Record<string, unknown>
    vi.clearAllMocks()
  })

  it('reconciles an existing plan without creating a duplicate', async () => {
    const prisma = mockPrismaRef.current as {
      plan: {
        findFirst: ReturnType<typeof vi.fn>
        create: ReturnType<typeof vi.fn>
      }
      product: { findFirst: ReturnType<typeof vi.fn> }
    }
    prisma.plan.findFirst.mockResolvedValue({
      id: 'blplan_existing',
      code: '876-couriers-pro',
    })

    const params = createParams()
    const result = await ensure('blten_1', params)

    expect(result.data).toEqual({ id: 'blplan_existing' })
    expect(result.error).toBeNull()
    expect(prisma.plan.create).not.toHaveBeenCalled()
    expect(
      (prisma.plan as unknown as { update: ReturnType<typeof vi.fn> }).update
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'blplan_existing' },
        data: expect.objectContaining({ name: 'Pro', isActive: true }),
      })
    )
    expect(prisma.plan.findFirst).toHaveBeenCalledTimes(1)
    expect(prisma.plan.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: 'blten_1',
        entitlementReferenceId: 'prd_core1',
        intervalUnit: 'MONTH',
        intervalCount: 1,
      },
      select: { id: true, code: true },
    })
  })

  it('creates plan when none exists and product is found', async () => {
    const prisma = mockPrismaRef.current as {
      plan: {
        findFirst: ReturnType<typeof vi.fn>
        create: ReturnType<typeof vi.fn>
      }
      product: { findFirst: ReturnType<typeof vi.fn> }
    }
    prisma.plan.findFirst.mockResolvedValue(null)
    prisma.product.findFirst.mockResolvedValue({ id: 'blprod_1' })
    prisma.plan.create.mockResolvedValue({
      id: 'blplan_new',
      entitlementReferenceId: 'prd_core1',
      code: '876-couriers-pro',
      isActive: true,
    })

    const params = createParams()
    const result = await ensure('blten_1', params)

    expect(result.data).not.toBeNull()
    expect(result.error).toBeNull()
    expect(prisma.plan.create).toHaveBeenCalledTimes(1)
    const createCall = prisma.plan.create.mock.calls[0][0]
    expect(createCall.data).toEqual(
      expect.objectContaining({
        entitlementReferenceId: 'prd_core1',
        code: '876-couriers-pro',
        isActive: true,
        id: expect.stringMatching(/^plan_/),
      })
    )
  })

  it('returns 404 error when product is missing inside create', async () => {
    const prisma = mockPrismaRef.current as {
      plan: {
        findFirst: ReturnType<typeof vi.fn>
        create: ReturnType<typeof vi.fn>
      }
      product: { findFirst: ReturnType<typeof vi.fn> }
    }
    prisma.plan.findFirst.mockResolvedValue(null)
    prisma.product.findFirst.mockResolvedValue(null)

    const params = createParams()
    const result = await ensure('blten_1', params)

    expect(result.data).toBeNull()
    expect(result.error).toBe('The selected product was not found.')
    expect((result as { status?: number }).status).toBe(404)
    expect(prisma.plan.create).not.toHaveBeenCalled()
  })

  it('handles race condition: returns winner plan on P2002 conflict when re-lookup succeeds', async () => {
    const prisma = mockPrismaRef.current as {
      plan: {
        findFirst: ReturnType<typeof vi.fn>
        create: ReturnType<typeof vi.fn>
      }
      product: { findFirst: ReturnType<typeof vi.fn> }
    }
    // First findFirst → null (no existing plan), second findFirst (re-lookup) → race winner
    prisma.plan.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'blplan_won',
      code: '876-couriers-pro',
    })
    prisma.product.findFirst.mockResolvedValue({ id: 'blprod_1' })
    // create rejects with P2002
    prisma.plan.create.mockRejectedValue({ code: 'P2002' })

    const params = createParams()
    const result = await ensure('blten_1', params)

    expect(result.data).toEqual({ id: 'blplan_won' })
    expect(result.error).toBeNull()
    expect(prisma.plan.create).toHaveBeenCalledTimes(1)
  })

  it('retries with suffixed code when P2002 conflict and no race winner found', async () => {
    const prisma = mockPrismaRef.current as {
      plan: {
        findFirst: ReturnType<typeof vi.fn>
        create: ReturnType<typeof vi.fn>
      }
      product: { findFirst: ReturnType<typeof vi.fn> }
    }
    // First findFirst → null, second findFirst (re-lookup after 409) → null (no winner)
    prisma.plan.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
    prisma.product.findFirst.mockResolvedValue({ id: 'blprod_1' })
    // First create rejects P2002, second create succeeds
    prisma.plan.create
      .mockRejectedValueOnce({ code: 'P2002' })
      .mockResolvedValueOnce({ id: 'blplan_retry' })

    const params = createParams()
    const result = await ensure('blten_1', params)

    expect(result.data).toEqual({ id: 'blplan_retry' })
    expect(result.error).toBeNull()
    expect(prisma.plan.create).toHaveBeenCalledTimes(2)
    const secondCreateCall = prisma.plan.create.mock.calls[1][0]
    expect(secondCreateCall.data.code).toBe('876-couriers-pro-1month')
    expect(
      (prisma.plan as unknown as { update: ReturnType<typeof vi.fn> }).update
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: '876-couriers-pro-1month' }),
      })
    )
  })

  it('retains an existing cadence code when the renamed base code is occupied', async () => {
    const prisma = mockPrismaRef.current as {
      plan: {
        findFirst: ReturnType<typeof vi.fn>
        update: ReturnType<typeof vi.fn>
      }
    }
    prisma.plan.findFirst.mockResolvedValue({
      id: 'blplan_yearly',
      code: '876-couriers-pro-1year',
    })
    prisma.plan.update
      .mockRejectedValueOnce({ code: 'P2002' })
      .mockResolvedValueOnce({ id: 'blplan_yearly' })

    const result = await ensure(
      'blten_1',
      createParams({ intervalUnit: 'YEAR' })
    )

    expect(result).toEqual({ data: { id: 'blplan_yearly' }, error: null })
    expect(prisma.plan.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({ code: '876-couriers-pro-1year' }),
      })
    )
  })
})
