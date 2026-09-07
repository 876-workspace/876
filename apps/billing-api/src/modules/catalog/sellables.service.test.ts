import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ loadSellables: vi.fn() }))
vi.mock('./sellables.repository', () => ({ loadSellables: mocks.loadSellables }))

import {
  resolveSellables,
  resolveVariantReferences,
  sellableKey,
} from './sellables.service'

function item(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item_1',
    name: 'Widget',
    sku: 'WIDGET',
    type: 'GOOD',
    variantMode: 'single',
    unit: 'piece',
    isTaxable: true,
    taxCode: 'standard',
    trackStock: true,
    defaultSellingAmount: 500n,
    defaultSellingCurrency: 'JMD',
    media: [{ fileId: 'file_parent' }],
    ...overrides,
  }
}

function variant(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ivar_blue',
    itemId: 'item_1',
    name: 'Blue',
    sku: 'WIDGET-BLUE',
    defaultSellingAmount: 650n,
    defaultSellingCurrency: 'JMD',
    media: [{ fileId: 'file_variant' }],
    ...overrides,
  }
}

describe('Catalog sellable resolution', () => {
  beforeEach(() => vi.clearAllMocks())

  it('resolves a tracked single Item to one canonical stock target', async () => {
    mocks.loadSellables.mockResolvedValue([[item()], []])
    const reference = { itemId: 'item_1', variantId: null }

    const result = await resolveSellables('ten_1', [reference, reference])

    expect(mocks.loadSellables).toHaveBeenCalledWith('ten_1', ['item_1'], [])
    expect(result.error).toBeNull()
    if (result.error !== null) return
    expect(result.data.get(sellableKey(reference))).toEqual({
      reference,
      identity: {
        name: 'Widget',
        variantName: null,
        sku: 'WIDGET',
      },
      type: 'GOOD',
      unit: 'piece',
      taxable: true,
      taxCode: 'standard',
      defaultSellingAmount: 500n,
      defaultSellingCurrency: 'JMD',
      pricingReference: reference,
      stockTarget: { type: 'item', id: 'item_1' },
      primaryFileId: 'file_parent',
    })
  })

  it('uses Variant identity, price defaults, media, and stock target', async () => {
    mocks.loadSellables.mockResolvedValue([
      [item({ variantMode: 'variant' })],
      [variant()],
    ])
    const reference = { itemId: 'item_1', variantId: 'ivar_blue' }

    const result = await resolveSellables('ten_1', [reference])

    expect(result.error).toBeNull()
    if (result.error !== null) return
    expect(result.data.get(sellableKey(reference))).toEqual(
      expect.objectContaining({
        identity: {
          name: 'Widget',
          variantName: 'Blue',
          sku: 'WIDGET-BLUE',
        },
        defaultSellingAmount: 650n,
        defaultSellingCurrency: 'JMD',
        stockTarget: { type: 'variant', id: 'ivar_blue' },
        primaryFileId: 'file_variant',
      })
    )
  })

  it('requires a Variant for a variant-mode Item', async () => {
    mocks.loadSellables.mockResolvedValue([
      [item({ variantMode: 'variant' })],
      [],
    ])

    await expect(
      resolveSellables('ten_1', [{ itemId: 'item_1', variantId: null }])
    ).resolves.toEqual({
      data: null,
      error: 'Choose a variant for each variant-based item.',
      status: 409,
      code: 'billing/item-variant-required',
    })
  })

  it('rejects a Variant that belongs to another Item', async () => {
    mocks.loadSellables.mockResolvedValue([
      [item({ variantMode: 'variant' })],
      [variant({ itemId: 'item_other' })],
    ])

    await expect(
      resolveSellables('ten_1', [
        { itemId: 'item_1', variantId: 'ivar_blue' },
      ])
    ).resolves.toEqual({
      data: null,
      error: 'The selected item variant does not belong to this item.',
      status: 409,
      code: 'billing/item-variant-not-found',
    })
  })

  it('maps Variant-only legacy selections back to canonical Item references', async () => {
    mocks.loadSellables.mockResolvedValue([[], [variant()]])

    const result = await resolveVariantReferences('ten_1', [
      'ivar_blue',
      'ivar_blue',
    ])

    expect(mocks.loadSellables).toHaveBeenCalledWith('ten_1', [], ['ivar_blue'])
    expect(result.error).toBeNull()
    if (result.error !== null) return
    expect(result.data.get('ivar_blue')).toEqual({
      itemId: 'item_1',
      variantId: 'ivar_blue',
    })
  })
})
