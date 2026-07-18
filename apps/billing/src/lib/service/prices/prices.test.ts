import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { create } from './create'
import { deletePrice } from './delete'
import { ensure } from './ensure'
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
    itemId: 'item_123',
    planId: null,
    currency: 'JMD',
    unitAmount: 5_000n,
    pricingModel: 'FLAT',
    priceType: 'ONE_TIME',
    intervalUnit: null,
    intervalCount: null,
    isTaxable: false,
    tiers: [],
    ...overrides,
  } as never
}

function ensureParams(overrides: Record<string, unknown> = {}) {
  return {
    planId: 'plan_123',
    entitlementReferenceId: 'prc_core_123',
    nickname: 'Pro monthly',
    currency: 'JMD',
    unitAmount: 5_000n,
    intervalUnit: 'MONTH' as const,
    intervalCount: 1,
    active: true,
    ...overrides,
  }
}

function persistedPrice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prc_123',
    planId: 'plan_123',
    currency: 'JMD',
    unitAmount: 5_000n,
    intervalUnit: 'MONTH',
    intervalCount: 1,
    ...overrides,
  }
}

describe('price mutations', () => {
  beforeEach(() => {
    mocks.prismaRef.current = {
      item: { findFirst: vi.fn().mockResolvedValue({ id: 'item_123' }) },
      plan: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'plan_123',
          intervalUnit: 'MONTH',
          intervalCount: 1,
        }),
      },
      price: {
        create: vi.fn().mockResolvedValue({ id: 'prc_123' }),
        delete: vi.fn().mockResolvedValue({ id: 'prc_123' }),
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({ id: 'prc_123' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    }
    mocks.hasEnabledCurrency.mockResolvedValue(true)
    mocks.generateId.mockImplementation((type: string) =>
      type === 'Price' ? 'prc_123' : 'ptier_123'
    )
    mocks.nowUnixSeconds.mockReturnValue(1_783_771_200)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects a disabled currency before resolving the target', async () => {
    const prisma = mocks.prismaRef.current as unknown as {
      item: { findFirst: ReturnType<typeof vi.fn> }
      plan: { findFirst: ReturnType<typeof vi.fn> }
      price: { create: ReturnType<typeof vi.fn> }
    }
    mocks.hasEnabledCurrency.mockResolvedValue(false)

    const result = await create('ten_123', createParams())

    expect(result).toEqual({
      data: null,
      error: 'Enable this currency before creating a price.',
      status: 422,
    })
    expect(prisma.item.findFirst).not.toHaveBeenCalled()
    expect(prisma.plan.findFirst).not.toHaveBeenCalled()
    expect(prisma.price.create).not.toHaveBeenCalled()
  })

  it('returns 404 for a missing item', async () => {
    const prisma = mocks.prismaRef.current as unknown as {
      item: { findFirst: ReturnType<typeof vi.fn> }
      price: { create: ReturnType<typeof vi.fn> }
    }
    prisma.item.findFirst.mockResolvedValue(null)

    const result = await create('ten_123', createParams())

    expect(result).toEqual({
      data: null,
      error: 'The selected item was not found.',
      status: 404,
    })
    expect(prisma.price.create).not.toHaveBeenCalled()
  })

  it('returns 404 for a missing plan', async () => {
    const prisma = mocks.prismaRef.current as unknown as {
      plan: { findFirst: ReturnType<typeof vi.fn> }
      price: { create: ReturnType<typeof vi.fn> }
    }
    prisma.plan.findFirst.mockResolvedValue(null)

    const result = await create(
      'ten_123',
      createParams({
        itemId: null,
        planId: 'plan_missing',
        priceType: 'RECURRING',
        intervalUnit: 'MONTH',
        intervalCount: 1,
      })
    )

    expect(result).toEqual({
      data: null,
      error: 'The selected plan was not found.',
      status: 404,
    })
    expect(prisma.price.create).not.toHaveBeenCalled()
  })

  it('rejects a one-time plan price', async () => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: { create: ReturnType<typeof vi.fn> }
      }
    ).price

    const result = await create(
      'ten_123',
      createParams({ itemId: null, planId: 'plan_123' })
    )

    expect(result).toEqual({
      data: null,
      error: 'A plan price must be recurring.',
      status: 422,
    })
    expect(price.create).not.toHaveBeenCalled()
  })

  it.each([
    { intervalUnit: 'YEAR', intervalCount: 1 },
    { intervalUnit: 'MONTH', intervalCount: 2 },
  ])('rejects plan cadence mismatch %j', async (cadence) => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: { create: ReturnType<typeof vi.fn> }
      }
    ).price

    const result = await create(
      'ten_123',
      createParams({
        itemId: null,
        planId: 'plan_123',
        priceType: 'RECURRING',
        ...cadence,
      })
    )

    expect(result).toEqual({
      data: null,
      error: 'A plan price must use the plan billing cadence.',
      status: 422,
    })
    expect(price.create).not.toHaveBeenCalled()
  })

  it('creates an item price with normalized optional fields', async () => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: { create: ReturnType<typeof vi.fn> }
      }
    ).price

    const result = await create('ten_123', createParams())

    expect(result).toEqual({ data: { id: 'prc_123' }, error: null })
    expect(price.create).toHaveBeenCalledWith({
      data: {
        id: 'prc_123',
        tenantId: 'ten_123',
        itemId: 'item_123',
        planId: null,
        addonId: null,
        nickname: null,
        entitlementReferenceId: null,
        currency: 'JMD',
        unitAmount: 5_000n,
        pricingModel: 'FLAT',
        priceType: 'ONE_TIME',
        intervalUnit: null,
        intervalCount: null,
        unitName: null,
        packageSize: null,
        isTaxable: false,
        isActive: true,
        createdAt: 1_783_771_200,
        updatedAt: 1_783_771_200,
        tiers: { create: [] },
      },
    })
  })

  it('creates a recurring plan price and immutable tiers', async () => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: { create: ReturnType<typeof vi.fn> }
      }
    ).price
    const params = createParams({
      itemId: null,
      planId: 'plan_123',
      nickname: 'Pro monthly',
      entitlementReferenceId: 'prc_core_123',
      pricingModel: 'TIERED',
      priceType: 'RECURRING',
      intervalUnit: 'MONTH',
      intervalCount: 1,
      unitAmount: null,
      unitName: 'seat',
      packageSize: null,
      isTaxable: true,
      tiers: [
        { fromUnit: 1, toUnit: 10, unitAmount: 500n },
        { fromUnit: 11, flatAmount: 4_000n },
      ],
    })

    const result = await create('ten_123', params)

    expect(result.error).toBeNull()
    expect(mocks.generateId).toHaveBeenCalledTimes(3)
    expect(price.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        itemId: null,
        planId: 'plan_123',
        nickname: 'Pro monthly',
        entitlementReferenceId: 'prc_core_123',
        pricingModel: 'TIERED',
        priceType: 'RECURRING',
        intervalUnit: 'MONTH',
        intervalCount: 1,
        unitAmount: null,
        unitName: 'seat',
        isTaxable: true,
        tiers: {
          create: [
            {
              id: 'ptier_123',
              fromUnit: 1,
              toUnit: 10,
              unitAmount: 500n,
              flatAmount: null,
              createdAt: 1_783_771_200,
              updatedAt: 1_783_771_200,
            },
            {
              id: 'ptier_123',
              fromUnit: 11,
              toUnit: null,
              unitAmount: null,
              flatAmount: 4_000n,
              createdAt: 1_783_771_200,
              updatedAt: 1_783_771_200,
            },
          ],
        },
      }),
    })
  })

  it('maps duplicate tier starts to conflict', async () => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: { create: ReturnType<typeof vi.fn> }
      }
    ).price
    price.create.mockRejectedValue({ code: 'P2002' })

    const result = await create('ten_123', createParams())

    expect(result).toEqual({
      data: null,
      error: 'Each price tier must start at a unique quantity.',
      status: 409,
    })
  })

  it('returns a safe 500 for unexpected create failure', async () => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: { create: ReturnType<typeof vi.fn> }
      }
    ).price
    price.create.mockRejectedValue(new Error('database unavailable'))

    const result = await create('ten_123', createParams())

    expect(result).toEqual({
      data: null,
      error: 'Failed to create the price.',
      status: 500,
    })
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  it('rejects an empty price update', async () => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).price

    const result = await update('ten_123', 'prc_123', {})

    expect(result).toEqual({
      data: null,
      error: 'Nothing to update.',
      status: 422,
    })
    expect(price.updateMany).not.toHaveBeenCalled()
  })

  it('updates nickname and active state including null and false', async () => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).price

    const result = await update('ten_123', 'prc_123', {
      nickname: null,
      isActive: false,
    })

    expect(result).toEqual({ data: { id: 'prc_123' }, error: null })
    expect(price.updateMany).toHaveBeenCalledWith({
      where: { id: 'prc_123', tenantId: 'ten_123' },
      data: {
        updatedAt: 1_783_771_200,
        nickname: null,
        isActive: false,
      },
    })
  })

  it('returns 404 when no price matches an update', async () => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).price
    price.updateMany.mockResolvedValue({ count: 0 })

    const result = await update('ten_123', 'prc_missing', {
      nickname: 'Missing',
    })

    expect(result).toEqual({
      data: null,
      error: 'Price not found.',
      status: 404,
    })
  })

  it('returns a safe 500 for unexpected update failure', async () => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).price
    price.updateMany.mockRejectedValue(new Error('database unavailable'))

    const result = await update('ten_123', 'prc_123', { nickname: 'Updated' })

    expect(result).toEqual({
      data: null,
      error: 'Failed to update the price.',
      status: 500,
    })
  })

  it('returns 404 when deleting a missing price', async () => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: { delete: ReturnType<typeof vi.fn> }
      }
    ).price

    const result = await deletePrice('ten_123', 'prc_missing')

    expect(result).toEqual({
      data: null,
      error: 'Price not found.',
      status: 404,
    })
    expect(price.delete).not.toHaveBeenCalled()
  })

  it.each([
    { subscriptionItems: 1, quoteLines: 0, invoiceLines: 0 },
    { subscriptionItems: 0, quoteLines: 1, invoiceLines: 0 },
    { subscriptionItems: 0, quoteLines: 0, invoiceLines: 1 },
  ])('protects a referenced price with counts %j', async (counts) => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: {
          findFirst: ReturnType<typeof vi.fn>
          delete: ReturnType<typeof vi.fn>
        }
      }
    ).price
    price.findFirst.mockResolvedValue({ _count: counts })

    const result = await deletePrice('ten_123', 'prc_123')

    expect(result).toEqual({
      data: null,
      error:
        'This price is used by subscriptions or documents. Deactivate the price instead.',
      status: 409,
    })
    expect(price.delete).not.toHaveBeenCalled()
  })

  it('deletes an unreferenced price', async () => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: {
          findFirst: ReturnType<typeof vi.fn>
          delete: ReturnType<typeof vi.fn>
        }
      }
    ).price
    price.findFirst.mockResolvedValue({
      _count: { subscriptionItems: 0, quoteLines: 0, invoiceLines: 0 },
    })

    const result = await deletePrice('ten_123', 'prc_123')

    expect(result).toEqual({ data: { id: 'prc_123' }, error: null })
    expect(price.delete).toHaveBeenCalledWith({ where: { id: 'prc_123' } })
  })

  it('returns a safe 500 when deletion throws', async () => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: { findFirst: ReturnType<typeof vi.fn> }
      }
    ).price
    price.findFirst.mockRejectedValue(new Error('database unavailable'))

    const result = await deletePrice('ten_123', 'prc_123')

    expect(result).toEqual({
      data: null,
      error: 'Failed to delete the price.',
      status: 500,
    })
  })

  it('reconciles matching immutable terms for an existing mirrored price', async () => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
          update: ReturnType<typeof vi.fn>
        }
      }
    ).price
    price.findFirst.mockResolvedValue(persistedPrice())

    const result = await ensure('ten_123', ensureParams())

    expect(result).toEqual({ data: { id: 'prc_123' }, error: null })
    expect(price.update).toHaveBeenCalledWith({
      where: { id: 'prc_123' },
      data: {
        nickname: 'Pro monthly',
        isActive: true,
        updatedAt: 1_783_771_200,
      },
    })
    expect(price.create).not.toHaveBeenCalled()
  })

  it.each([
    { planId: 'plan_other' },
    { currency: 'USD' },
    { unitAmount: 4_999n },
    { intervalUnit: 'YEAR' },
    { intervalCount: 2 },
  ])('rejects immutable mirrored term mismatch %#', async (override) => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: {
          findFirst: ReturnType<typeof vi.fn>
          update: ReturnType<typeof vi.fn>
        }
      }
    ).price
    price.findFirst.mockResolvedValue(persistedPrice(override))

    const result = await ensure('ten_123', ensureParams())

    expect(result).toEqual({
      data: null,
      error: 'This price reference is linked to different immutable terms.',
      status: 409,
    })
    expect(price.update).not.toHaveBeenCalled()
  })

  it('creates, reloads, and reconciles a missing mirrored price', async () => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: {
          findFirst: ReturnType<typeof vi.fn>
          create: ReturnType<typeof vi.fn>
          update: ReturnType<typeof vi.fn>
        }
      }
    ).price
    price.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(persistedPrice())

    const result = await ensure('ten_123', ensureParams())

    expect(result).toEqual({ data: { id: 'prc_123' }, error: null })
    expect(price.create).toHaveBeenCalledTimes(1)
    expect(price.update).toHaveBeenCalledTimes(1)
  })

  it('returns create success when the created price cannot be reloaded', async () => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: {
          findFirst: ReturnType<typeof vi.fn>
          update: ReturnType<typeof vi.fn>
        }
      }
    ).price
    price.findFirst.mockResolvedValue(null)

    const result = await ensure('ten_123', ensureParams())

    expect(result).toEqual({ data: { id: 'prc_123' }, error: null })
    expect(price.findFirst).toHaveBeenCalledTimes(2)
    expect(price.update).not.toHaveBeenCalled()
  })

  it('reconciles the race winner after a create conflict', async () => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: {
          findFirst: ReturnType<typeof vi.fn>
          create: ReturnType<typeof vi.fn>
          update: ReturnType<typeof vi.fn>
        }
      }
    ).price
    price.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(persistedPrice({ id: 'prc_winner' }))
    price.create.mockRejectedValue({ code: 'P2002' })

    const result = await ensure('ten_123', ensureParams())

    expect(result).toEqual({ data: { id: 'prc_winner' }, error: null })
    expect(price.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'prc_winner' } })
    )
  })

  it('returns the original conflict when no race winner exists', async () => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: {
          findFirst: ReturnType<typeof vi.fn>
          create: ReturnType<typeof vi.fn>
        }
      }
    ).price
    price.findFirst.mockResolvedValue(null)
    price.create.mockRejectedValue({ code: 'P2002' })

    const result = await ensure('ten_123', ensureParams())

    expect(result).toEqual({
      data: null,
      error: 'Each price tier must start at a unique quantity.',
      status: 409,
    })
  })

  it('returns a safe 500 when mirrored price reconciliation throws', async () => {
    const price = (
      mocks.prismaRef.current as unknown as {
        price: {
          findFirst: ReturnType<typeof vi.fn>
          update: ReturnType<typeof vi.fn>
        }
      }
    ).price
    price.findFirst.mockResolvedValue(persistedPrice())
    price.update.mockRejectedValue(new Error('database unavailable'))

    const result = await ensure('ten_123', ensureParams())

    expect(result).toEqual({
      data: null,
      error: 'Failed to reconcile the price.',
      status: 500,
    })
    expect(console.error).toHaveBeenCalledTimes(1)
  })
})
