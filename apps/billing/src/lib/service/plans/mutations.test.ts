import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { create } from './create'
import { deletePlan } from './delete'
import { update } from './update'

const mocks = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
  hasEnabledCurrency: vi.fn(),
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
vi.mock('../shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../shared')>()
  return { ...actual, hasEnabledCurrency: mocks.hasEnabledCurrency }
})

function createParams(overrides: Record<string, unknown> = {}) {
  return {
    productId: 'prod_123',
    code: 'couriers-pro',
    name: 'Pro',
    intervalUnit: 'MONTH',
    intervalCount: 1,
    trialDays: 0,
    isTaxable: false,
    ...overrides,
  } as never
}

describe('plan create, update, and delete', () => {
  beforeEach(() => {
    mocks.prismaRef.current = {
      product: { findFirst: vi.fn().mockResolvedValue({ id: 'prod_123' }) },
      plan: {
        create: vi.fn().mockResolvedValue({ id: 'plan_123' }),
        delete: vi.fn().mockResolvedValue({ id: 'plan_123' }),
        findFirst: vi.fn().mockResolvedValue(null),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    }
    mocks.hasEnabledCurrency.mockResolvedValue(true)
    mocks.generateId.mockReturnValue('plan_123')
    mocks.nowUnixSeconds.mockReturnValue(1_783_771_200)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 404 before currency checks when the product is missing', async () => {
    const prisma = mocks.prismaRef.current as unknown as {
      product: { findFirst: ReturnType<typeof vi.fn> }
      plan: { create: ReturnType<typeof vi.fn> }
    }
    prisma.product.findFirst.mockResolvedValue(null)

    const result = await create(
      'ten_123',
      createParams({ setupFeeCurrency: 'USD' })
    )

    expect(result).toEqual({
      data: null,
      error: 'The selected product was not found.',
      status: 404,
    })
    expect(mocks.hasEnabledCurrency).not.toHaveBeenCalled()
    expect(prisma.plan.create).not.toHaveBeenCalled()
  })

  it('rejects a setup-fee currency that is not enabled', async () => {
    const plan = (
      mocks.prismaRef.current as unknown as {
        plan: { create: ReturnType<typeof vi.fn> }
      }
    ).plan
    mocks.hasEnabledCurrency.mockResolvedValue(false)

    const result = await create(
      'ten_123',
      createParams({ setupFeeCurrency: 'USD' })
    )

    expect(result).toEqual({
      data: null,
      error: 'Enable the setup-fee currency before using it on a plan.',
      status: 422,
    })
    expect(plan.create).not.toHaveBeenCalled()
  })

  it('creates a plan with normalized optional fields', async () => {
    const prisma = mocks.prismaRef.current as unknown as {
      product: { findFirst: ReturnType<typeof vi.fn> }
      plan: { create: ReturnType<typeof vi.fn> }
    }

    const result = await create('ten_123', createParams())

    expect(result).toEqual({ data: { id: 'plan_123' }, error: null })
    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: { id: 'prod_123', tenantId: 'ten_123' },
      select: { id: true },
    })
    expect(mocks.hasEnabledCurrency).not.toHaveBeenCalled()
    expect(mocks.generateId).toHaveBeenCalledWith('Plan')
    expect(prisma.plan.create).toHaveBeenCalledWith({
      data: {
        id: 'plan_123',
        tenantId: 'ten_123',
        productId: 'prod_123',
        code: 'couriers-pro',
        name: 'Pro',
        description: null,
        imageUrl: null,
        unitName: null,
        taxCode: null,
        entitlementReferenceId: null,
        intervalUnit: 'MONTH',
        intervalCount: 1,
        billingCycleCount: null,
        trialDays: 0,
        setupFeeAmount: null,
        setupFeeCurrency: null,
        isTaxable: false,
        isFree: false,
        showInCheckout: true,
        isActive: true,
        createdAt: 1_783_771_200,
        updatedAt: 1_783_771_200,
      },
    })
  })

  it('persists explicit recurring and setup fee fields', async () => {
    const plan = (
      mocks.prismaRef.current as unknown as {
        plan: { create: ReturnType<typeof vi.fn> }
      }
    ).plan
    const params = createParams({
      description: 'Annual access.',
      entitlementReferenceId: 'prd_core_123',
      intervalUnit: 'YEAR',
      intervalCount: 2,
      billingCycleCount: 4,
      trialDays: 30,
      setupFeeAmount: 1_000n,
      setupFeeCurrency: 'JMD',
      isTaxable: true,
    })

    const result = await create('ten_123', params)

    expect(result.error).toBeNull()
    expect(mocks.hasEnabledCurrency).toHaveBeenCalledWith('ten_123', 'JMD')
    expect(plan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: 'Annual access.',
        entitlementReferenceId: 'prd_core_123',
        intervalUnit: 'YEAR',
        intervalCount: 2,
        billingCycleCount: 4,
        trialDays: 30,
        setupFeeAmount: 1_000n,
        setupFeeCurrency: 'JMD',
        isTaxable: true,
      }),
    })
  })

  it('maps duplicate plan code to conflict', async () => {
    const plan = (
      mocks.prismaRef.current as unknown as {
        plan: { create: ReturnType<typeof vi.fn> }
      }
    ).plan
    plan.create.mockRejectedValue({ code: 'P2002' })

    const result = await create('ten_123', createParams())

    expect(result).toEqual({
      data: null,
      error: 'A plan with this code already exists.',
      status: 409,
    })
  })

  it('returns a safe 500 for unexpected plan create failure', async () => {
    const plan = (
      mocks.prismaRef.current as unknown as {
        plan: { create: ReturnType<typeof vi.fn> }
      }
    ).plan
    plan.create.mockRejectedValue(new Error('database unavailable'))

    const result = await create('ten_123', createParams())

    expect(result).toEqual({
      data: null,
      error: 'Failed to create the plan.',
      status: 500,
    })
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  it('rejects an empty plan update', async () => {
    const plan = (
      mocks.prismaRef.current as unknown as {
        plan: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).plan

    const result = await update('ten_123', 'plan_123', {})

    expect(result).toEqual({
      data: null,
      error: 'Nothing to update.',
      status: 422,
    })
    expect(plan.updateMany).not.toHaveBeenCalled()
  })

  it('rejects an unavailable setup-fee currency update', async () => {
    const plan = (
      mocks.prismaRef.current as unknown as {
        plan: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).plan
    mocks.hasEnabledCurrency.mockResolvedValue(false)

    const result = await update('ten_123', 'plan_123', {
      setupFeeCurrency: 'USD',
    })

    expect(result).toEqual({
      data: null,
      error: 'Enable the setup fee currency before using it.',
      status: 422,
    })
    expect(plan.updateMany).not.toHaveBeenCalled()
  })

  it('updates every supplied plan field including false and null', async () => {
    const plan = (
      mocks.prismaRef.current as unknown as {
        plan: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).plan
    const params = {
      name: 'Pro Annual',
      description: null,
      trialDays: 0,
      setupFeeAmount: null,
      setupFeeCurrency: null,
      isTaxable: false,
      isActive: false,
    }

    const result = await update('ten_123', 'plan_123', params)

    expect(result).toEqual({ data: { id: 'plan_123' }, error: null })
    expect(mocks.hasEnabledCurrency).not.toHaveBeenCalled()
    expect(plan.updateMany).toHaveBeenCalledWith({
      where: { id: 'plan_123', tenantId: 'ten_123' },
      data: { updatedAt: 1_783_771_200, ...params },
    })
  })

  it('returns 404 when no plan matches an update', async () => {
    const plan = (
      mocks.prismaRef.current as unknown as {
        plan: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).plan
    plan.updateMany.mockResolvedValue({ count: 0 })

    const result = await update('ten_123', 'plan_missing', { name: 'Missing' })

    expect(result).toEqual({
      data: null,
      error: 'Plan not found.',
      status: 404,
    })
  })

  it('returns a safe 500 for unexpected plan update failure', async () => {
    const plan = (
      mocks.prismaRef.current as unknown as {
        plan: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).plan
    plan.updateMany.mockRejectedValue(new Error('database unavailable'))

    const result = await update('ten_123', 'plan_123', { name: 'Updated' })

    expect(result).toEqual({
      data: null,
      error: 'Failed to update the plan.',
      status: 500,
    })
  })

  it('returns 404 when deleting a missing plan', async () => {
    const plan = (
      mocks.prismaRef.current as unknown as {
        plan: { delete: ReturnType<typeof vi.fn> }
      }
    ).plan

    const result = await deletePlan('ten_123', 'plan_missing')

    expect(result).toEqual({
      data: null,
      error: 'Plan not found.',
      status: 404,
    })
    expect(plan.delete).not.toHaveBeenCalled()
  })

  it('protects a plan with prices', async () => {
    const plan = (
      mocks.prismaRef.current as unknown as {
        plan: {
          findFirst: ReturnType<typeof vi.fn>
          delete: ReturnType<typeof vi.fn>
        }
      }
    ).plan
    plan.findFirst.mockResolvedValue({
      _count: {
        prices: 1,
        addonAssociations: 0,
        couponApplicabilities: 0,
        fallbackForProducts: 0,
      },
    })

    const result = await deletePlan('ten_123', 'plan_123')

    expect(result).toEqual({
      data: null,
      error:
        'This plan has prices or catalog associations. Deactivate the plan instead.',
      status: 409,
    })
    expect(plan.delete).not.toHaveBeenCalled()
  })

  it('deletes a plan without prices', async () => {
    const plan = (
      mocks.prismaRef.current as unknown as {
        plan: {
          findFirst: ReturnType<typeof vi.fn>
          delete: ReturnType<typeof vi.fn>
        }
      }
    ).plan
    plan.findFirst.mockResolvedValue({
      _count: {
        prices: 0,
        addonAssociations: 0,
        couponApplicabilities: 0,
        fallbackForProducts: 0,
      },
    })

    const result = await deletePlan('ten_123', 'plan_123')

    expect(result).toEqual({ data: { id: 'plan_123' }, error: null })
    expect(plan.delete).toHaveBeenCalledWith({ where: { id: 'plan_123' } })
  })

  it('returns a safe 500 when plan deletion throws', async () => {
    const plan = (
      mocks.prismaRef.current as unknown as {
        plan: { findFirst: ReturnType<typeof vi.fn> }
      }
    ).plan
    plan.findFirst.mockRejectedValue(new Error('database unavailable'))

    const result = await deletePlan('ten_123', 'plan_123')

    expect(result).toEqual({
      data: null,
      error: 'Failed to delete the plan.',
      status: 500,
    })
  })
})
