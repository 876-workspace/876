import { describe, expect, it } from 'vitest'

import {
  ItemCreateSchema,
  ItemStockAdjustmentSchema,
  ItemUpdateSchema,
} from './item'

describe('Item stock schemas', () => {
  it('accepts stock configuration for goods', () => {
    const result = ItemCreateSchema.safeParse({
      type: 'GOOD',
      name: 'Widget',
      trackStock: true,
      stockQuantity: 8,
      lowStockThreshold: 2,
      allowOutOfStock: false,
    })

    expect(result.success).toBe(true)
  })

  it('rejects stock tracking for services', () => {
    const result = ItemCreateSchema.safeParse({
      type: 'SERVICE',
      name: 'Consulting',
      trackStock: true,
    })

    expect(result.success).toBe(false)
  })

  it('rejects an opening quantity when tracking is disabled', () => {
    const result = ItemCreateSchema.safeParse({
      type: 'GOOD',
      name: 'Widget',
      stockQuantity: 8,
    })

    expect(result.success).toBe(false)
  })

  it('keeps current quantity out of generic item updates', () => {
    const result = ItemUpdateSchema.safeParse({ stockQuantity: 9 })

    expect(result.success).toBe(false)
  })

  it('allows signed manual adjustments so policy can be enforced against the item', () => {
    expect(ItemStockAdjustmentSchema.safeParse({ quantity: -2 }).success).toBe(
      true
    )
  })
})
