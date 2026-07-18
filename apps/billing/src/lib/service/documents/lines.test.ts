import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DocumentLineCreateParams } from '@/types/document-line'

import { buildDocumentLines } from './lines'

const { prismaRef } = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return prismaRef.current
  },
}))

function createLine(
  overrides: Partial<DocumentLineCreateParams> = {}
): DocumentLineCreateParams {
  return {
    description: 'Implementation services',
    quantity: 2,
    unitAmount: 5_000n,
    taxAmount: 750n,
    discountAmount: 500n,
    ...overrides,
  }
}

function createItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item_123',
    name: 'Implementation services',
    defaultSellingAmount: 5_000n,
    defaultSellingCurrency: 'JMD',
    ...overrides,
  }
}

function createPrice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prc_123',
    currency: 'JMD',
    unitAmount: 5_000n,
    pricingModel: 'PER_UNIT',
    packageSize: null,
    unitName: null,
    tiers: [],
    item: null,
    plan: null,
    addon: null,
    ...overrides,
  }
}

describe('buildDocumentLines', () => {
  beforeEach(() => {
    prismaRef.current = {
      item: { findMany: vi.fn().mockResolvedValue([]) },
      price: { findMany: vi.fn().mockResolvedValue([]) },
      priceList: { findFirst: vi.fn().mockResolvedValue(null) },
    }
    vi.clearAllMocks()
  })

  it('builds explicit lines and totals without catalogue references', async () => {
    const prisma = prismaRef.current as unknown as {
      item: { findMany: ReturnType<typeof vi.fn> }
      price: { findMany: ReturnType<typeof vi.fn> }
    }

    const result = await buildDocumentLines('ten_123', 'JMD', [createLine()])

    expect(result).toEqual({
      data: {
        lines: [
          {
            itemId: null,
            priceId: null,
            description: 'Implementation services',
            unit: null,
            quantity: 2,
            unitAmount: 5_000n,
            taxAmount: 750n,
            discountAmount: 500n,
            totalAmount: 10_250n,
          },
        ],
        subtotalAmount: 10_000n,
        taxAmount: 750n,
        totalAmount: 10_250n,
        priceList: null,
      },
      error: null,
    })
    expect(prisma.item.findMany).toHaveBeenCalledWith({
      where: { id: { in: [] }, tenantId: 'ten_123', isActive: true },
    })
    expect(prisma.price.findMany).toHaveBeenCalledWith({
      where: { id: { in: [] }, tenantId: 'ten_123', isActive: true },
      include: {
        item: true,
        plan: { include: { product: true } },
        addon: { include: { product: true } },
        tiers: { orderBy: { fromUnit: 'asc' } },
      },
    })
  })

  it('deduplicates referenced item and price IDs before querying', async () => {
    const prisma = prismaRef.current as unknown as {
      item: { findMany: ReturnType<typeof vi.fn> }
      price: { findMany: ReturnType<typeof vi.fn> }
    }
    prisma.item.findMany.mockResolvedValue([createItem()])
    prisma.price.findMany.mockResolvedValue([createPrice()])
    const line = createLine({ itemId: 'item_123', priceId: 'prc_123' })

    const result = await buildDocumentLines('ten_123', 'JMD', [line, line])

    expect(result.error).toBeNull()
    expect(prisma.item.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['item_123'] },
        tenantId: 'ten_123',
        isActive: true,
      },
    })
    expect(prisma.price.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['prc_123'] } }),
      })
    )
  })

  it('rejects a missing item before building any line', async () => {
    const result = await buildDocumentLines('ten_123', 'JMD', [
      createLine({ itemId: 'item_missing' }),
    ])

    expect(result).toEqual({
      data: null,
      error: 'One or more selected items were not found.',
    })
  })

  it('rejects a missing price before building any line', async () => {
    const prisma = prismaRef.current as unknown as {
      price: { findMany: ReturnType<typeof vi.fn> }
    }
    prisma.price.findMany.mockResolvedValue([])

    const result = await buildDocumentLines('ten_123', 'JMD', [
      createLine({ priceId: 'prc_missing' }),
    ])

    expect(result).toEqual({
      data: null,
      error: 'One or more selected prices were not found.',
    })
  })

  it('rejects a selected price in a different currency', async () => {
    const prisma = prismaRef.current as unknown as {
      price: { findMany: ReturnType<typeof vi.fn> }
    }
    prisma.price.findMany.mockResolvedValue([createPrice({ currency: 'USD' })])

    const result = await buildDocumentLines('ten_123', 'JMD', [
      createLine({ priceId: 'prc_123' }),
    ])

    expect(result).toEqual({
      data: null,
      error: 'Every selected price must use the document currency.',
    })
  })

  it('uses selected item defaults for amount and description', async () => {
    const prisma = prismaRef.current as unknown as {
      item: { findMany: ReturnType<typeof vi.fn> }
    }
    prisma.item.findMany.mockResolvedValue([createItem()])

    const result = await buildDocumentLines('ten_123', 'JMD', [
      createLine({
        itemId: 'item_123',
        description: null,
        unitAmount: null,
        taxAmount: undefined,
        discountAmount: undefined,
        quantity: 1,
      }),
    ])

    expect(result).toEqual({
      data: {
        lines: [
          {
            itemId: 'item_123',
            priceId: null,
            description: 'Implementation services',
            unit: null,
            quantity: 1,
            unitAmount: 5_000n,
            taxAmount: 0n,
            discountAmount: 0n,
            totalAmount: 5_000n,
          },
        ],
        subtotalAmount: 5_000n,
        taxAmount: 0n,
        totalAmount: 5_000n,
        priceList: null,
      },
      error: null,
    })
  })

  it('uses a price item before plan descriptions', async () => {
    const prisma = prismaRef.current as unknown as {
      price: { findMany: ReturnType<typeof vi.fn> }
    }
    prisma.price.findMany.mockResolvedValue([
      createPrice({
        item: createItem({ id: 'item_from_price', name: 'Price item' }),
        plan: { name: 'Plan name', product: { name: 'Product name' } },
      }),
    ])

    const result = await buildDocumentLines('ten_123', 'JMD', [
      createLine({
        priceId: 'prc_123',
        description: null,
        unitAmount: null,
      }),
    ])

    expect(result.data?.lines[0]).toEqual(
      expect.objectContaining({
        itemId: 'item_from_price',
        priceId: 'prc_123',
        description: 'Price item',
        unitAmount: 5_000n,
      })
    )
  })

  it.each([
    [{ name: 'Plan name', product: { name: 'Product name' } }, 'Plan name'],
    [{ name: null, product: { name: 'Product name' } }, 'Product name'],
  ])('falls back through price plan description %#', async (plan, expected) => {
    const prisma = prismaRef.current as unknown as {
      price: { findMany: ReturnType<typeof vi.fn> }
    }
    prisma.price.findMany.mockResolvedValue([createPrice({ plan })])

    const result = await buildDocumentLines('ten_123', 'JMD', [
      createLine({ priceId: 'prc_123', description: null }),
    ])

    expect(result.data?.lines[0]?.description).toBe(expected)
    expect(result.error).toBeNull()
  })

  it('rejects a line with no explicit or matching default amount', async () => {
    const prisma = prismaRef.current as unknown as {
      item: { findMany: ReturnType<typeof vi.fn> }
    }
    prisma.item.findMany.mockResolvedValue([
      createItem({ defaultSellingCurrency: 'USD' }),
    ])

    const result = await buildDocumentLines('ten_123', 'JMD', [
      createLine({ itemId: 'item_123', unitAmount: null }),
    ])

    expect(result).toEqual({
      data: null,
      error: 'Each line needs a unit amount or a matching item/price default.',
    })
  })

  it('rejects a line with no resolvable description', async () => {
    const result = await buildDocumentLines('ten_123', 'JMD', [
      createLine({ description: null }),
    ])

    expect(result).toEqual({
      data: null,
      error: 'Each line needs a description.',
    })
  })

  it('rejects a discount greater than the line subtotal', async () => {
    const result = await buildDocumentLines('ten_123', 'JMD', [
      createLine({
        quantity: 2,
        unitAmount: 500n,
        discountAmount: 1_001n,
      }),
    ])

    expect(result).toEqual({
      data: null,
      error: 'A line discount cannot exceed the line subtotal.',
    })
  })

  it('allows a discount equal to the line subtotal', async () => {
    const result = await buildDocumentLines('ten_123', 'JMD', [
      createLine({
        quantity: 2,
        unitAmount: 500n,
        taxAmount: 100n,
        discountAmount: 1_000n,
      }),
    ])

    expect(result.data?.totalAmount).toBe(100n)
    expect(result.error).toBeNull()
  })

  it('applies and snapshots a percentage price list for a catalog price', async () => {
    const prisma = prismaRef.current as unknown as {
      price: { findMany: ReturnType<typeof vi.fn> }
      priceList: { findFirst: ReturnType<typeof vi.fn> }
    }
    prisma.price.findMany.mockResolvedValue([
      createPrice({ unitAmount: 1_000n }),
    ])
    prisma.priceList.findFirst.mockResolvedValue({
      id: 'plist_123',
      name: 'Partner pricing',
      mode: 'PERCENTAGE',
      direction: 'MARKDOWN',
      percentage: 10,
      rounding: 'NONE',
      roundingPrecision: 2,
      entries: [],
    })

    const result = await buildDocumentLines(
      'ten_123',
      'JMD',
      [
        createLine({
          priceId: 'prc_123',
          quantity: 2,
          unitAmount: 1_000n,
          taxAmount: 0n,
          discountAmount: 0n,
        }),
      ],
      'plist_123'
    )

    expect(result).toEqual({
      data: {
        lines: [
          expect.objectContaining({
            priceId: 'prc_123',
            unitAmount: 1_000n,
            totalAmount: 1_800n,
          }),
        ],
        subtotalAmount: 1_800n,
        taxAmount: 0n,
        totalAmount: 1_800n,
        priceList: { id: 'plist_123', name: 'Partner pricing' },
      },
      error: null,
    })
  })
})
