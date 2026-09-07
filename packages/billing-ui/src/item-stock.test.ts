import { describe, expect, it } from 'vitest'

import { formatItemStock, getItemStockStatus } from './item-stock'

const base = {
  type: 'GOOD',
  trackStock: true,
  stockQuantity: 12,
  lowStockThreshold: 3,
}

describe('item stock presentation', () => {
  it('does not track services even if malformed data carries stock fields', () => {
    expect(getItemStockStatus({ ...base, type: 'SERVICE' })).toBe('not-tracked')
    expect(formatItemStock({ ...base, type: 'SERVICE' })).toBe('—')
  })

  it('does not track goods when tracking is disabled', () => {
    expect(getItemStockStatus({ ...base, trackStock: false })).toBe(
      'not-tracked'
    )
  })

  it('reports positive quantities above the threshold as in stock', () => {
    expect(getItemStockStatus(base)).toBe('in-stock')
    expect(formatItemStock(base)).toBe('12')
  })

  it('reports quantities at the threshold as low stock', () => {
    const item = { ...base, stockQuantity: 3 }
    expect(getItemStockStatus(item)).toBe('low-stock')
    expect(formatItemStock(item)).toBe('Low · 3')
  })

  it('reports zero and negative quantities as out of stock', () => {
    expect(getItemStockStatus({ ...base, stockQuantity: 0 })).toBe(
      'out-of-stock'
    )
    expect(formatItemStock({ ...base, stockQuantity: -2 })).toBe('Out · -2')
  })
})
