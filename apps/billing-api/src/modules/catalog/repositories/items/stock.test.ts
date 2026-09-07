import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  generateId: vi.fn(() => 'ism_test'),
}))

vi.mock('@/platform/ids', () => ({ generateId: mocks.generateId }))

import { stock } from './stock'

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

type FinalizedMovement = {
  itemId: string
  variantId: string | null
  quantityDelta: number
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
    id: 'variant_blue',
    itemId: 'item_1',
    name: 'Blue',
    stockQuantity: 10,
    item: trackedItem({
      id: 'item_1',
      name: 'Widget',
      variantMode: 'variant',
    }),
    ...overrides,
  }
}

function stockTx(
  options: {
    trackedItems?: TrackedItem[]
    trackedVariants?: TrackedVariant[]
    finalizedMovements?: FinalizedMovement[]
    restoreItem?: Pick<TrackedItem, 'id' | 'type' | 'stockQuantity'> | null
    restoreVariant?:
      | (Pick<TrackedVariant, 'id' | 'stockQuantity'> & {
          item: Pick<TrackedItem, 'type'>
        })
      | null
  } = {}
) {
  const itemFindMany = vi.fn().mockResolvedValue(options.trackedItems ?? [])
  const itemFindFirst = vi.fn().mockResolvedValue(options.restoreItem ?? null)
  const itemUpdate = vi.fn().mockResolvedValue({})
  const variantFindMany = vi
    .fn()
    .mockResolvedValue(options.trackedVariants ?? [])
  const variantFindFirst = vi
    .fn()
    .mockResolvedValue(options.restoreVariant ?? null)
  const variantUpdate = vi.fn().mockResolvedValue({})
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
    itemFindMany,
    itemFindFirst,
    itemUpdate,
    variantFindMany,
    variantFindFirst,
    variantUpdate,
    movementFindMany,
    movementCreate,
  }
}

const itemSelect = {
  id: true,
  name: true,
  type: true,
  variantMode: true,
  trackStock: true,
  stockQuantity: true,
  allowOutOfStock: true,
}

const variantItemSelect = {
  id: true,
  name: true,
  type: true,
  variantMode: true,
  trackStock: true,
  allowOutOfStock: true,
}

describe('item stock invoice operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('aggregates duplicate single-item invoice lines before decrementing stock', async () => {
    const { tx, itemFindMany, itemUpdate, variantFindMany, movementCreate } =
      stockTx({ trackedItems: [trackedItem()] })

    await expect(
      stock.applyInvoice(
        tx,
        'ten_1',
        'inv_1',
        [
          { itemId: 'item_1', variantId: null, quantity: 2 },
          { itemId: 'item_1', variantId: null, quantity: 3 },
        ],
        100
      )
    ).resolves.toEqual({ data: { movementCount: 1 }, error: null })

    expect(itemFindMany).toHaveBeenCalledTimes(1)
    expect(itemFindMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', id: { in: ['item_1'] } },
      select: itemSelect,
    })
    expect(variantFindMany).toHaveBeenCalledTimes(1)
    expect(variantFindMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', id: { in: [] } },
      include: { item: { select: variantItemSelect } },
    })
    expect(itemUpdate).toHaveBeenCalledTimes(1)
    expect(itemUpdate).toHaveBeenCalledWith({
      where: { id: 'item_1' },
      data: { stockQuantity: 5, updatedAt: 100 },
    })
    expect(movementCreate).toHaveBeenCalledTimes(1)
    expect(movementCreate).toHaveBeenCalledWith({
      data: {
        id: 'ism_test',
        tenantId: 'ten_1',
        itemId: 'item_1',
        variantId: null,
        stockTargetKey: 'item_1',
        type: 'invoice-finalized',
        quantityDelta: -5,
        quantityBefore: 10,
        quantityAfter: 5,
        referenceType: 'invoice',
        referenceId: 'inv_1',
        createdAt: 100,
      },
    })
  })

  it('blocks an aggregated single-item quantity that exceeds available stock', async () => {
    const { tx, itemUpdate, variantUpdate, movementCreate } = stockTx({
      trackedItems: [trackedItem({ stockQuantity: 4 })],
    })

    await expect(
      stock.applyInvoice(
        tx,
        'ten_1',
        'inv_1',
        [
          { itemId: 'item_1', variantId: null, quantity: 2 },
          { itemId: 'item_1', variantId: null, quantity: 3 },
        ],
        100
      )
    ).resolves.toEqual({
      data: null,
      error: 'Only 4 units of Widget are currently in stock.',
      status: 409,
      code: 'billing/item-insufficient-stock',
    })

    expect(itemUpdate).not.toHaveBeenCalled()
    expect(variantUpdate).not.toHaveBeenCalled()
    expect(movementCreate).not.toHaveBeenCalled()
  })

  it('permits negative stock when a single item explicitly allows it', async () => {
    const { tx, itemUpdate, variantUpdate, movementCreate } = stockTx({
      trackedItems: [trackedItem({ stockQuantity: 1, allowOutOfStock: true })],
    })

    await expect(
      stock.applyInvoice(
        tx,
        'ten_1',
        'inv_1',
        [{ itemId: 'item_1', variantId: null, quantity: 3 }],
        100
      )
    ).resolves.toEqual({ data: { movementCount: 1 }, error: null })

    expect(itemUpdate).toHaveBeenCalledTimes(1)
    expect(itemUpdate).toHaveBeenCalledWith({
      where: { id: 'item_1' },
      data: { stockQuantity: -2, updatedAt: 100 },
    })
    expect(variantUpdate).not.toHaveBeenCalled()
    expect(movementCreate).toHaveBeenCalledTimes(1)
  })

  it('ignores services and untracked items returned by no tracked-stock query', async () => {
    const {
      tx,
      itemFindMany,
      itemUpdate,
      variantFindMany,
      variantUpdate,
      movementCreate,
    } = stockTx()

    await expect(
      stock.applyInvoice(
        tx,
        'ten_1',
        'inv_1',
        [{ itemId: 'item_service', variantId: null, quantity: 5 }],
        100
      )
    ).resolves.toEqual({ data: { movementCount: 0 }, error: null })

    expect(itemFindMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', id: { in: ['item_service'] } },
      select: itemSelect,
    })
    expect(variantFindMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', id: { in: [] } },
      include: { item: { select: variantItemSelect } },
    })
    expect(itemUpdate).not.toHaveBeenCalled()
    expect(variantUpdate).not.toHaveBeenCalled()
    expect(movementCreate).not.toHaveBeenCalled()
  })

  it('restores the exact quantity recorded by single-item invoice finalization', async () => {
    const {
      tx,
      itemFindFirst,
      itemUpdate,
      variantFindFirst,
      variantUpdate,
      movementCreate,
    } = stockTx({
      finalizedMovements: [
        { itemId: 'item_1', variantId: null, quantityDelta: -4 },
      ],
      restoreItem: {
        id: 'item_1',
        type: 'GOOD',
        stockQuantity: 7,
      },
    })

    await expect(
      stock.restoreInvoice(tx, 'ten_1', 'inv_1', 200)
    ).resolves.toEqual({ data: { movementCount: 1 }, error: null })

    expect(itemFindFirst).toHaveBeenCalledTimes(1)
    expect(itemFindFirst).toHaveBeenCalledWith({
      where: { id: 'item_1', tenantId: 'ten_1' },
      select: { id: true, type: true, stockQuantity: true },
    })
    expect(itemUpdate).toHaveBeenCalledWith({
      where: { id: 'item_1' },
      data: { stockQuantity: 11, updatedAt: 200 },
    })
    expect(variantFindFirst).not.toHaveBeenCalled()
    expect(variantUpdate).not.toHaveBeenCalled()
    expect(movementCreate).toHaveBeenCalledWith({
      data: {
        id: 'ism_test',
        tenantId: 'ten_1',
        itemId: 'item_1',
        variantId: null,
        stockTargetKey: 'item_1',
        type: 'invoice-voided',
        quantityDelta: 4,
        quantityBefore: 7,
        quantityAfter: 11,
        referenceType: 'invoice',
        referenceId: 'inv_1',
        createdAt: 200,
      },
    })
  })

  it('aggregates duplicate variant lines by item and selected variant', async () => {
    const { tx, itemUpdate, variantFindMany, variantUpdate, movementCreate } =
      stockTx({
        trackedVariants: [
          trackedVariant(),
          trackedVariant({ id: 'variant_red', name: 'Red', stockQuantity: 8 }),
        ],
      })

    await expect(
      stock.applyInvoice(
        tx,
        'ten_1',
        'inv_1',
        [
          { itemId: 'item_1', variantId: 'variant_blue', quantity: 2 },
          { itemId: 'item_1', variantId: 'variant_blue', quantity: 3 },
          { itemId: 'item_1', variantId: 'variant_red', quantity: 4 },
        ],
        100
      )
    ).resolves.toEqual({ data: { movementCount: 2 }, error: null })

    expect(variantFindMany).toHaveBeenCalledTimes(1)
    expect(variantFindMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_1',
        id: { in: ['variant_blue', 'variant_red'] },
      },
      include: { item: { select: variantItemSelect } },
    })
    expect(itemUpdate).not.toHaveBeenCalled()
    expect(variantUpdate).toHaveBeenCalledTimes(2)
    expect(variantUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: 'variant_blue' },
      data: { stockQuantity: 5, updatedAt: 100 },
    })
    expect(variantUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: 'variant_red' },
      data: { stockQuantity: 4, updatedAt: 100 },
    })
    expect(movementCreate).toHaveBeenCalledTimes(2)
  })

  it('decrements the selected variant and never the parent item', async () => {
    const {
      tx,
      itemFindMany,
      itemUpdate,
      variantFindMany,
      variantUpdate,
      movementCreate,
    } = stockTx({ trackedVariants: [trackedVariant({ stockQuantity: 9 })] })

    await expect(
      stock.applyInvoice(
        tx,
        'ten_1',
        'inv_1',
        [{ itemId: 'item_1', variantId: 'variant_blue', quantity: 3 }],
        100
      )
    ).resolves.toEqual({ data: { movementCount: 1 }, error: null })

    expect(itemFindMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', id: { in: ['item_1'] } },
      select: itemSelect,
    })
    expect(variantFindMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', id: { in: ['variant_blue'] } },
      include: { item: { select: variantItemSelect } },
    })
    expect(variantUpdate).toHaveBeenCalledTimes(1)
    expect(variantUpdate).toHaveBeenCalledWith({
      where: { id: 'variant_blue' },
      data: { stockQuantity: 6, updatedAt: 100 },
    })
    expect(itemUpdate).not.toHaveBeenCalled()
    expect(movementCreate).toHaveBeenCalledTimes(1)
  })

  it('denies an invoice when the selected variant has insufficient stock', async () => {
    const {
      tx,
      itemFindMany,
      itemUpdate,
      variantFindMany,
      variantUpdate,
      movementCreate,
    } = stockTx({ trackedVariants: [trackedVariant({ stockQuantity: 2 })] })

    await expect(
      stock.applyInvoice(
        tx,
        'ten_1',
        'inv_1',
        [{ itemId: 'item_1', variantId: 'variant_blue', quantity: 3 }],
        100
      )
    ).resolves.toEqual({
      data: null,
      error: 'Only 2 units of Widget — Blue are currently in stock.',
      status: 409,
      code: 'billing/item-insufficient-stock',
    })

    expect(itemFindMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', id: { in: ['item_1'] } },
      select: itemSelect,
    })
    expect(variantFindMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', id: { in: ['variant_blue'] } },
      include: { item: { select: variantItemSelect } },
    })
    expect(itemUpdate).not.toHaveBeenCalled()
    expect(variantUpdate).not.toHaveBeenCalled()
    expect(movementCreate).not.toHaveBeenCalled()
  })

  it('permits negative stock when the selected variant allows out-of-stock sales', async () => {
    const {
      tx,
      itemFindMany,
      itemUpdate,
      variantFindMany,
      variantUpdate,
      movementCreate,
    } = stockTx({
      trackedVariants: [
        trackedVariant({
          stockQuantity: 1,
          item: trackedItem({
            variantMode: 'variant',
            allowOutOfStock: true,
          }),
        }),
      ],
    })

    await expect(
      stock.applyInvoice(
        tx,
        'ten_1',
        'inv_1',
        [{ itemId: 'item_1', variantId: 'variant_blue', quantity: 3 }],
        100
      )
    ).resolves.toEqual({ data: { movementCount: 1 }, error: null })

    expect(itemFindMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', id: { in: ['item_1'] } },
      select: itemSelect,
    })
    expect(variantFindMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', id: { in: ['variant_blue'] } },
      include: { item: { select: variantItemSelect } },
    })
    expect(variantUpdate).toHaveBeenCalledWith({
      where: { id: 'variant_blue' },
      data: { stockQuantity: -2, updatedAt: 100 },
    })
    expect(itemUpdate).not.toHaveBeenCalled()
    expect(movementCreate).toHaveBeenCalledTimes(1)
  })

  it('records the selected variant on its stock movement', async () => {
    const {
      tx,
      itemFindMany,
      itemUpdate,
      variantFindMany,
      variantUpdate,
      movementCreate,
    } = stockTx({ trackedVariants: [trackedVariant({ stockQuantity: 7 })] })

    await expect(
      stock.applyInvoice(
        tx,
        'ten_1',
        'inv_1',
        [{ itemId: 'item_1', variantId: 'variant_blue', quantity: 2 }],
        100
      )
    ).resolves.toEqual({ data: { movementCount: 1 }, error: null })

    expect(itemFindMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', id: { in: ['item_1'] } },
      select: itemSelect,
    })
    expect(variantFindMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', id: { in: ['variant_blue'] } },
      include: { item: { select: variantItemSelect } },
    })
    expect(variantUpdate).toHaveBeenCalledWith({
      where: { id: 'variant_blue' },
      data: { stockQuantity: 5, updatedAt: 100 },
    })
    expect(itemUpdate).not.toHaveBeenCalled()
    expect(movementCreate).toHaveBeenCalledTimes(1)
    expect(movementCreate).toHaveBeenCalledWith({
      data: {
        id: 'ism_test',
        tenantId: 'ten_1',
        itemId: 'item_1',
        variantId: 'variant_blue',
        stockTargetKey: 'variant_blue',
        type: 'invoice-finalized',
        quantityDelta: -2,
        quantityBefore: 7,
        quantityAfter: 5,
        referenceType: 'invoice',
        referenceId: 'inv_1',
        createdAt: 100,
      },
    })
  })

  it('restores the exact selected variant that invoice finalization decremented', async () => {
    const {
      tx,
      itemFindFirst,
      itemUpdate,
      variantFindFirst,
      variantUpdate,
      movementCreate,
    } = stockTx({
      finalizedMovements: [
        {
          itemId: 'item_1',
          variantId: 'variant_blue',
          quantityDelta: -4,
        },
      ],
      restoreVariant: {
        id: 'variant_blue',
        stockQuantity: 7,
        item: { type: 'GOOD' },
      },
    })

    await expect(
      stock.restoreInvoice(tx, 'ten_1', 'inv_1', 200)
    ).resolves.toEqual({ data: { movementCount: 1 }, error: null })

    expect(variantFindFirst).toHaveBeenCalledTimes(1)
    expect(variantFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'variant_blue',
        itemId: 'item_1',
        tenantId: 'ten_1',
      },
      include: { item: { select: { type: true } } },
    })
    expect(variantUpdate).toHaveBeenCalledWith({
      where: { id: 'variant_blue' },
      data: { stockQuantity: 11, updatedAt: 200 },
    })
    expect(itemFindFirst).not.toHaveBeenCalled()
    expect(itemUpdate).not.toHaveBeenCalled()
    expect(movementCreate).toHaveBeenCalledWith({
      data: {
        id: 'ism_test',
        tenantId: 'ten_1',
        itemId: 'item_1',
        variantId: 'variant_blue',
        stockTargetKey: 'variant_blue',
        type: 'invoice-voided',
        quantityDelta: 4,
        quantityBefore: 7,
        quantityAfter: 11,
        referenceType: 'invoice',
        referenceId: 'inv_1',
        createdAt: 200,
      },
    })
  })

  it('keeps single-item behavior unchanged when variant support is present', async () => {
    const {
      tx,
      itemFindMany,
      itemUpdate,
      variantFindMany,
      variantUpdate,
      movementCreate,
    } = stockTx({ trackedItems: [trackedItem({ stockQuantity: 6 })] })

    await expect(
      stock.applyInvoice(
        tx,
        'ten_1',
        'inv_1',
        [{ itemId: 'item_1', variantId: null, quantity: 2 }],
        100
      )
    ).resolves.toEqual({ data: { movementCount: 1 }, error: null })

    expect(itemFindMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', id: { in: ['item_1'] } },
      select: itemSelect,
    })
    expect(variantFindMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', id: { in: [] } },
      include: { item: { select: variantItemSelect } },
    })
    expect(itemUpdate).toHaveBeenCalledWith({
      where: { id: 'item_1' },
      data: { stockQuantity: 4, updatedAt: 100 },
    })
    expect(variantUpdate).not.toHaveBeenCalled()
    expect(movementCreate).toHaveBeenCalledWith({
      data: {
        id: 'ism_test',
        tenantId: 'ten_1',
        itemId: 'item_1',
        variantId: null,
        stockTargetKey: 'item_1',
        type: 'invoice-finalized',
        quantityDelta: -2,
        quantityBefore: 6,
        quantityAfter: 4,
        referenceType: 'invoice',
        referenceId: 'inv_1',
        createdAt: 100,
      },
    })
  })
})
