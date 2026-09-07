import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  generateId: vi.fn(() => 'ism_test'),
}))

vi.mock('@/platform/ids', () => ({ generateId: mocks.generateId }))

import { stock } from './stock'

function stockTx(options: {
  tracked?: Array<{
    id: string
    name: string
    stockQuantity: number | null
    allowOutOfStock: boolean
  }>
  finalizedMovements?: Array<{
    itemId: string
    quantityDelta: number
  }>
  restoreItem?: {
    id: string
    type: 'GOOD' | 'SERVICE'
    stockQuantity: number | null
  } | null
}) {
  const itemFindMany = vi.fn().mockResolvedValue(options.tracked ?? [])
  const itemFindFirst = vi.fn().mockResolvedValue(options.restoreItem ?? null)
  const itemUpdate = vi.fn().mockResolvedValue({})
  const movementFindMany = vi
    .fn()
    .mockResolvedValue(options.finalizedMovements ?? [])
  const movementCreate = vi.fn().mockResolvedValue({})

  return {
    tx: {
      item: {
        findMany: itemFindMany,
        findFirst: itemFindFirst,
        update: itemUpdate,
      },
      itemStockMovement: {
        findMany: movementFindMany,
        create: movementCreate,
      },
    } as never,
    itemFindMany,
    itemUpdate,
    movementCreate,
  }
}

describe('item stock invoice operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('aggregates duplicate invoice lines before decrementing stock', async () => {
    const { tx, itemUpdate, movementCreate } = stockTx({
      tracked: [
        {
          id: 'item_1',
          name: 'Widget',
          stockQuantity: 10,
          allowOutOfStock: false,
        },
      ],
    })

    await expect(
      stock.applyInvoice(
        tx,
        'ten_1',
        'inv_1',
        [
          { itemId: 'item_1', quantity: 2 },
          { itemId: 'item_1', quantity: 3 },
        ],
        100
      )
    ).resolves.toEqual({ data: { movementCount: 1 }, error: null })

    expect(itemUpdate).toHaveBeenCalledOnce()
    expect(itemUpdate).toHaveBeenCalledWith({
      where: { id: 'item_1' },
      data: { stockQuantity: 5, updatedAt: 100 },
    })
    expect(movementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'ten_1',
        itemId: 'item_1',
        type: 'invoice-finalized',
        quantityDelta: -5,
        quantityBefore: 10,
        quantityAfter: 5,
        referenceType: 'invoice',
        referenceId: 'inv_1',
      }),
    })
  })

  it('blocks an aggregated quantity that exceeds available stock', async () => {
    const { tx, itemUpdate, movementCreate } = stockTx({
      tracked: [
        {
          id: 'item_1',
          name: 'Widget',
          stockQuantity: 4,
          allowOutOfStock: false,
        },
      ],
    })

    await expect(
      stock.applyInvoice(
        tx,
        'ten_1',
        'inv_1',
        [
          { itemId: 'item_1', quantity: 2 },
          { itemId: 'item_1', quantity: 3 },
        ],
        100
      )
    ).resolves.toMatchObject({
      data: null,
      status: 409,
      code: 'billing/item-insufficient-stock',
    })

    expect(itemUpdate).not.toHaveBeenCalled()
    expect(movementCreate).not.toHaveBeenCalled()
  })

  it('permits negative stock when the item explicitly allows it', async () => {
    const { tx, itemUpdate } = stockTx({
      tracked: [
        {
          id: 'item_1',
          name: 'Widget',
          stockQuantity: 1,
          allowOutOfStock: true,
        },
      ],
    })

    await expect(
      stock.applyInvoice(
        tx,
        'ten_1',
        'inv_1',
        [{ itemId: 'item_1', quantity: 3 }],
        100
      )
    ).resolves.toEqual({ data: { movementCount: 1 }, error: null })

    expect(itemUpdate).toHaveBeenCalledWith({
      where: { id: 'item_1' },
      data: { stockQuantity: -2, updatedAt: 100 },
    })
  })

  it('ignores services and untracked items returned by no tracked-stock query', async () => {
    const { tx, itemUpdate, movementCreate } = stockTx({ tracked: [] })

    await expect(
      stock.applyInvoice(
        tx,
        'ten_1',
        'inv_1',
        [{ itemId: 'item_service', quantity: 5 }],
        100
      )
    ).resolves.toEqual({ data: { movementCount: 0 }, error: null })

    expect(itemUpdate).not.toHaveBeenCalled()
    expect(movementCreate).not.toHaveBeenCalled()
  })

  it('restores the exact quantity recorded by invoice finalization', async () => {
    const { tx, itemUpdate, movementCreate } = stockTx({
      finalizedMovements: [{ itemId: 'item_1', quantityDelta: -4 }],
      restoreItem: {
        id: 'item_1',
        type: 'GOOD',
        stockQuantity: 7,
      },
    })

    await expect(
      stock.restoreInvoice(tx, 'ten_1', 'inv_1', 200)
    ).resolves.toEqual({ data: { movementCount: 1 }, error: null })

    expect(itemUpdate).toHaveBeenCalledWith({
      where: { id: 'item_1' },
      data: { stockQuantity: 11, updatedAt: 200 },
    })
    expect(movementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        itemId: 'item_1',
        type: 'invoice-voided',
        quantityDelta: 4,
        quantityBefore: 7,
        quantityAfter: 11,
        referenceId: 'inv_1',
      }),
    })
  })
})
