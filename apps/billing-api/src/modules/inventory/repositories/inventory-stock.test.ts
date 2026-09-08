import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  generateId: vi.fn(() => 'ism_test'),
}))

vi.mock('@/platform/ids', () => ({ generateId: mocks.generateId }))

import { consume } from './consume'
import { restore } from './restore'

type TrackedItem = {
  id: string
  name: string
  type: 'GOOD' | 'SERVICE'
  variantMode: 'single' | 'variant'
  trackStock: boolean
  stockQuantity: number | null
  allowOutOfStock: boolean
}

type TrackedVariant = {
  id: string
  itemId: string
  name: string
  stockQuantity: number | null
  item: Omit<TrackedItem, 'stockQuantity'>
}

function trackedItem(overrides: Partial<TrackedItem> = {}): TrackedItem {
  return {
    id: 'item_1',
    name: 'Widget',
    type: 'GOOD',
    variantMode: 'single',
    trackStock: true,
    stockQuantity: 10,
    allowOutOfStock: false,
    ...overrides,
  }
}

function trackedVariant(
  overrides: Partial<TrackedVariant> = {}
): TrackedVariant {
  return {
    id: 'ivar_blue',
    itemId: 'item_1',
    name: 'Blue',
    stockQuantity: 8,
    item: trackedItem({
      id: 'item_1',
      name: 'Widget',
      variantMode: 'variant',
    }),
    ...overrides,
  }
}

function inventoryTx(options: {
  items?: TrackedItem[]
  variants?: TrackedVariant[]
  movements?: Array<{
    itemId: string
    variantId: string | null
    quantityDelta: number
  }>
  restoreItem?: Pick<TrackedItem, 'id' | 'type' | 'stockQuantity'> | null
  restoreVariant?:
    | (Pick<TrackedVariant, 'id' | 'itemId' | 'stockQuantity'> & {
        item: Pick<TrackedItem, 'type'>
      })
    | null
} = {}) {
  const itemFindMany = vi.fn().mockResolvedValue(options.items ?? [])
  const itemFindFirst = vi.fn().mockResolvedValue(options.restoreItem ?? null)
  const itemUpdate = vi.fn().mockResolvedValue({})
  const variantFindMany = vi.fn().mockResolvedValue(options.variants ?? [])
  const variantFindFirst = vi
    .fn()
    .mockResolvedValue(options.restoreVariant ?? null)
  const variantUpdate = vi.fn().mockResolvedValue({})
  const movementFindMany = vi.fn().mockResolvedValue(options.movements ?? [])
  const movementCreate = vi.fn().mockResolvedValue({})

  return {
    tx: {
      item: {
        findMany: itemFindMany,
        findFirst: itemFindFirst,
        update: itemUpdate,
      },
      itemVariant: {
        findMany: variantFindMany,
        findFirst: variantFindFirst,
        update: variantUpdate,
      },
      itemStockMovement: {
        findMany: movementFindMany,
        create: movementCreate,
      },
    } as never,
    itemUpdate,
    variantUpdate,
    movementFindMany,
    movementCreate,
  }
}

describe('Inventory generic stock commands', () => {
  beforeEach(() => vi.clearAllMocks())

  it('aggregates duplicate targets and records a semantic sale movement', async () => {
    const { tx, itemUpdate, movementCreate } = inventoryTx({
      items: [trackedItem()],
    })

    await expect(
      consume(tx, 'ten_1', {
        reference: { type: 'invoice', id: 'inv_1' },
        reason: 'sale',
        lines: [
          { target: { type: 'item', id: 'item_1' }, quantity: 2 },
          { target: { type: 'item', id: 'item_1' }, quantity: 3 },
        ],
        occurredAt: 100,
      })
    ).resolves.toEqual({ data: { movementCount: 1 }, error: null })

    expect(itemUpdate).toHaveBeenCalledWith({
      where: { id: 'item_1' },
      data: { stockQuantity: 5, updatedAt: 100 },
    })
    expect(movementCreate).toHaveBeenCalledWith({
      data: {
        id: 'ism_test',
        tenantId: 'ten_1',
        itemId: 'item_1',
        variantId: null,
        stockTargetKey: 'item_1',
        type: 'sale',
        quantityDelta: -5,
        quantityBefore: 10,
        quantityAfter: 5,
        referenceType: 'invoice',
        referenceId: 'inv_1',
        createdAt: 100,
      },
    })
  })

  it('blocks a target quantity that exceeds available stock', async () => {
    const { tx, itemUpdate, movementCreate } = inventoryTx({
      items: [trackedItem({ stockQuantity: 2 })],
    })

    await expect(
      consume(tx, 'ten_1', {
        reference: { type: 'invoice', id: 'inv_1' },
        reason: 'sale',
        lines: [{ target: { type: 'item', id: 'item_1' }, quantity: 3 }],
        occurredAt: 100,
      })
    ).resolves.toEqual({
      data: null,
      error: 'Only 2 units of Widget are currently in stock.',
      status: 409,
      code: 'billing/item-insufficient-stock',
    })

    expect(itemUpdate).not.toHaveBeenCalled()
    expect(movementCreate).not.toHaveBeenCalled()
  })

  it('consumes a concrete Variant target without mutating parent stock', async () => {
    const { tx, itemUpdate, variantUpdate, movementCreate } = inventoryTx({
      variants: [trackedVariant()],
    })

    await expect(
      consume(tx, 'ten_1', {
        reference: { type: 'invoice', id: 'inv_1' },
        reason: 'sale',
        lines: [{ target: { type: 'variant', id: 'ivar_blue' }, quantity: 3 }],
        occurredAt: 100,
      })
    ).resolves.toEqual({ data: { movementCount: 1 }, error: null })

    expect(itemUpdate).not.toHaveBeenCalled()
    expect(variantUpdate).toHaveBeenCalledWith({
      where: { id: 'ivar_blue' },
      data: { stockQuantity: 5, updatedAt: 100 },
    })
    expect(movementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        itemId: 'item_1',
        variantId: 'ivar_blue',
        stockTargetKey: 'ivar_blue',
        type: 'sale',
        quantityDelta: -3,
      }),
    })
  })

  it('restores legacy invoice-finalized history into a sale-reversal movement', async () => {
    const { tx, itemUpdate, movementFindMany, movementCreate } = inventoryTx({
      movements: [
        { itemId: 'item_1', variantId: null, quantityDelta: -4 },
      ],
      restoreItem: { id: 'item_1', type: 'GOOD', stockQuantity: 6 },
    })

    await expect(
      restore(tx, 'ten_1', {
        reference: { type: 'invoice', id: 'inv_legacy' },
        reason: 'sale',
        occurredAt: 200,
      })
    ).resolves.toEqual({ data: { movementCount: 1 }, error: null })

    expect(movementFindMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_1',
        type: { in: ['sale', 'invoice-finalized'] },
        referenceType: 'invoice',
        referenceId: 'inv_legacy',
      },
      orderBy: { createdAt: 'asc' },
    })
    expect(itemUpdate).toHaveBeenCalledWith({
      where: { id: 'item_1' },
      data: { stockQuantity: 10, updatedAt: 200 },
    })
    expect(movementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'sale-reversal',
        quantityDelta: 4,
        quantityBefore: 6,
        quantityAfter: 10,
        referenceId: 'inv_legacy',
      }),
    })
  })

  it('restores the exact Variant referenced by the original movement', async () => {
    const { tx, itemUpdate, variantUpdate, movementCreate } = inventoryTx({
      movements: [
        { itemId: 'item_1', variantId: 'ivar_blue', quantityDelta: -2 },
      ],
      restoreVariant: {
        id: 'ivar_blue',
        itemId: 'item_1',
        stockQuantity: 3,
        item: { type: 'GOOD' },
      },
    })

    await expect(
      restore(tx, 'ten_1', {
        reference: { type: 'invoice', id: 'inv_1' },
        reason: 'sale',
        occurredAt: 200,
      })
    ).resolves.toEqual({ data: { movementCount: 1 }, error: null })

    expect(itemUpdate).not.toHaveBeenCalled()
    expect(variantUpdate).toHaveBeenCalledWith({
      where: { id: 'ivar_blue' },
      data: { stockQuantity: 5, updatedAt: 200 },
    })
    expect(movementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        variantId: 'ivar_blue',
        stockTargetKey: 'ivar_blue',
        type: 'sale-reversal',
        quantityDelta: 2,
      }),
    })
  })
})
