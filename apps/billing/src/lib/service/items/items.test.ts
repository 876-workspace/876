import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { create } from './create'
import { deleteItem } from './delete'
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
    type: 'SERVICE',
    name: 'Implementation services',
    isTaxable: false,
    ...overrides,
  } as never
}

describe('item mutations', () => {
  beforeEach(() => {
    mocks.prismaRef.current = {
      item: {
        create: vi.fn().mockResolvedValue({ id: 'item_123' }),
        delete: vi.fn().mockResolvedValue({ id: 'item_123' }),
        findFirst: vi.fn().mockResolvedValue(null),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    }
    mocks.hasEnabledCurrency.mockResolvedValue(true)
    mocks.generateId.mockReturnValue('item_123')
    mocks.nowUnixSeconds.mockReturnValue(1_783_771_200)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates an item with normalized optional fields', async () => {
    const item = (
      mocks.prismaRef.current as unknown as {
        item: { create: ReturnType<typeof vi.fn> }
      }
    ).item

    const result = await create('ten_123', createParams())

    expect(result).toEqual({ data: { id: 'item_123' }, error: null })
    expect(mocks.hasEnabledCurrency).not.toHaveBeenCalled()
    expect(mocks.generateId).toHaveBeenCalledWith('Item')
    expect(item.create).toHaveBeenCalledWith({
      data: {
        id: 'item_123',
        tenantId: 'ten_123',
        type: 'SERVICE',
        name: 'Implementation services',
        sku: null,
        unit: null,
        description: null,
        imageUrl: null,
        defaultSellingAmount: null,
        defaultSellingCurrency: null,
        defaultCostAmount: null,
        defaultCostCurrency: null,
        isTaxable: false,
        taxCode: null,
        isActive: true,
        createdAt: 1_783_771_200,
        updatedAt: 1_783_771_200,
      },
    })
  })

  it('validates and persists selling and cost currencies', async () => {
    const item = (
      mocks.prismaRef.current as unknown as {
        item: { create: ReturnType<typeof vi.fn> }
      }
    ).item
    const params = createParams({
      defaultSellingAmount: 5_000n,
      defaultSellingCurrency: 'JMD',
      defaultCostAmount: 3_000n,
      defaultCostCurrency: 'USD',
    })

    const result = await create('ten_123', params)

    expect(result.error).toBeNull()
    expect(mocks.hasEnabledCurrency).toHaveBeenCalledTimes(2)
    expect(mocks.hasEnabledCurrency).toHaveBeenNthCalledWith(
      1,
      'ten_123',
      'JMD'
    )
    expect(mocks.hasEnabledCurrency).toHaveBeenNthCalledWith(
      2,
      'ten_123',
      'USD'
    )
    expect(item.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        defaultSellingAmount: 5_000n,
        defaultSellingCurrency: 'JMD',
        defaultCostAmount: 3_000n,
        defaultCostCurrency: 'USD',
      }),
    })
  })

  it('rejects an unavailable selling currency before checking cost currency', async () => {
    const item = (
      mocks.prismaRef.current as unknown as {
        item: { create: ReturnType<typeof vi.fn> }
      }
    ).item
    mocks.hasEnabledCurrency.mockResolvedValue(false)

    const result = await create(
      'ten_123',
      createParams({
        defaultSellingCurrency: 'USD',
        defaultCostCurrency: 'JMD',
      })
    )

    expect(result).toEqual({
      data: null,
      error: 'Enable the selling currency before using it on an item.',
      status: 422,
    })
    expect(mocks.hasEnabledCurrency).toHaveBeenCalledTimes(1)
    expect(item.create).not.toHaveBeenCalled()
  })

  it('rejects an unavailable cost currency', async () => {
    const item = (
      mocks.prismaRef.current as unknown as {
        item: { create: ReturnType<typeof vi.fn> }
      }
    ).item
    mocks.hasEnabledCurrency
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)

    const result = await create(
      'ten_123',
      createParams({
        defaultSellingCurrency: 'JMD',
        defaultCostCurrency: 'USD',
      })
    )

    expect(result).toEqual({
      data: null,
      error: 'Enable the cost currency before using it on an item.',
      status: 422,
    })
    expect(item.create).not.toHaveBeenCalled()
  })

  it('maps duplicate SKU creation to conflict', async () => {
    const item = (
      mocks.prismaRef.current as unknown as {
        item: { create: ReturnType<typeof vi.fn> }
      }
    ).item
    item.create.mockRejectedValue({ code: 'P2002' })

    const result = await create('ten_123', createParams({ sku: 'CONSULTING' }))

    expect(result).toEqual({
      data: null,
      error: 'An item with this SKU already exists in this workspace.',
      status: 409,
    })
    expect(console.error).not.toHaveBeenCalled()
  })

  it('returns a safe 500 for unexpected create failure', async () => {
    const item = (
      mocks.prismaRef.current as unknown as {
        item: { create: ReturnType<typeof vi.fn> }
      }
    ).item
    item.create.mockRejectedValue(new Error('database unavailable'))

    const result = await create('ten_123', createParams())

    expect(result).toEqual({
      data: null,
      error: 'Failed to create the item.',
      status: 500,
    })
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  it('rejects an empty item update', async () => {
    const item = (
      mocks.prismaRef.current as unknown as {
        item: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).item

    const result = await update('ten_123', 'item_123', {})

    expect(result).toEqual({
      data: null,
      error: 'Nothing to update.',
      status: 422,
    })
    expect(item.updateMany).not.toHaveBeenCalled()
  })

  it.each([
    ['selling', { defaultSellingCurrency: 'USD' }, 'selling'],
    ['cost', { defaultCostCurrency: 'USD' }, 'cost'],
  ])(
    'rejects an unavailable %s update currency',
    async (_name, params, label) => {
      const item = (
        mocks.prismaRef.current as unknown as {
          item: { updateMany: ReturnType<typeof vi.fn> }
        }
      ).item
      mocks.hasEnabledCurrency.mockResolvedValue(false)

      const result = await update('ten_123', 'item_123', params)

      expect(result).toEqual({
        data: null,
        error: `Enable the ${label} currency before using it on an item.`,
        status: 422,
      })
      expect(item.updateMany).not.toHaveBeenCalled()
    }
  )

  it('updates every supplied item field including false and null values', async () => {
    const item = (
      mocks.prismaRef.current as unknown as {
        item: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).item
    const params = {
      type: 'GOOD' as const,
      name: 'Hardware appliance',
      sku: null,
      unit: 'unit',
      description: null,
      imageUrl: null,
      defaultSellingAmount: null,
      defaultSellingCurrency: null,
      defaultCostAmount: null,
      defaultCostCurrency: null,
      isTaxable: false,
      taxCode: null,
      isActive: false,
    }

    const result = await update('ten_123', 'item_123', params)

    expect(result).toEqual({ data: { id: 'item_123' }, error: null })
    expect(mocks.hasEnabledCurrency).not.toHaveBeenCalled()
    expect(item.updateMany).toHaveBeenCalledWith({
      where: { id: 'item_123', tenantId: 'ten_123' },
      data: { updatedAt: 1_783_771_200, ...params },
    })
  })

  it('returns 404 when no item matches an update', async () => {
    const item = (
      mocks.prismaRef.current as unknown as {
        item: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).item
    item.updateMany.mockResolvedValue({ count: 0 })

    const result = await update('ten_123', 'item_missing', { name: 'Missing' })

    expect(result).toEqual({
      data: null,
      error: 'Item not found.',
      status: 404,
    })
  })

  it('maps duplicate SKU update to conflict', async () => {
    const item = (
      mocks.prismaRef.current as unknown as {
        item: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).item
    item.updateMany.mockRejectedValue({ code: 'P2002' })

    const result = await update('ten_123', 'item_123', { sku: 'DUPLICATE' })

    expect(result).toEqual({
      data: null,
      error: 'An item with this SKU already exists.',
      status: 409,
    })
  })

  it('returns a safe 500 for unexpected update failure', async () => {
    const item = (
      mocks.prismaRef.current as unknown as {
        item: { updateMany: ReturnType<typeof vi.fn> }
      }
    ).item
    item.updateMany.mockRejectedValue(new Error('database unavailable'))

    const result = await update('ten_123', 'item_123', { name: 'Updated' })

    expect(result).toEqual({
      data: null,
      error: 'Failed to update the item.',
      status: 500,
    })
  })

  it('returns 404 when deleting a missing item', async () => {
    const item = (
      mocks.prismaRef.current as unknown as {
        item: { delete: ReturnType<typeof vi.fn> }
      }
    ).item

    const result = await deleteItem('ten_123', 'item_missing')

    expect(result).toEqual({
      data: null,
      error: 'Item not found.',
      status: 404,
    })
    expect(item.delete).not.toHaveBeenCalled()
  })

  it.each([
    { prices: 1, quoteLines: 0, invoiceLines: 0 },
    { prices: 0, quoteLines: 1, invoiceLines: 0 },
    { prices: 0, quoteLines: 0, invoiceLines: 1 },
  ])('protects a referenced item with counts %j', async (counts) => {
    const item = (
      mocks.prismaRef.current as unknown as {
        item: {
          findFirst: ReturnType<typeof vi.fn>
          delete: ReturnType<typeof vi.fn>
        }
      }
    ).item
    item.findFirst.mockResolvedValue({ _count: counts })

    const result = await deleteItem('ten_123', 'item_123')

    expect(result).toEqual({
      data: null,
      error:
        'This item is referenced by prices or documents. Deactivate the item instead.',
      status: 409,
    })
    expect(item.delete).not.toHaveBeenCalled()
  })

  it('deletes an unreferenced item', async () => {
    const item = (
      mocks.prismaRef.current as unknown as {
        item: {
          findFirst: ReturnType<typeof vi.fn>
          delete: ReturnType<typeof vi.fn>
        }
      }
    ).item
    item.findFirst.mockResolvedValue({
      _count: { prices: 0, quoteLines: 0, invoiceLines: 0 },
    })

    const result = await deleteItem('ten_123', 'item_123')

    expect(result).toEqual({ data: { id: 'item_123' }, error: null })
    expect(item.delete).toHaveBeenCalledWith({ where: { id: 'item_123' } })
  })

  it('returns a safe 500 when deletion throws', async () => {
    const item = (
      mocks.prismaRef.current as unknown as {
        item: { findFirst: ReturnType<typeof vi.fn> }
      }
    ).item
    item.findFirst.mockRejectedValue(new Error('database unavailable'))

    const result = await deleteItem('ten_123', 'item_123')

    expect(result).toEqual({
      data: null,
      error: 'Failed to delete the item.',
      status: 500,
    })
    expect(console.error).toHaveBeenCalledTimes(1)
  })
})
