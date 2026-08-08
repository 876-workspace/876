import { describe, expect, it } from 'vitest'

import { columns } from './items-table'
import { ITEMS_SKELETON_COLUMNS } from './items-skeleton-columns'

/**
 * The `loading.tsx` fallback renders the real header row, so its column set has
 * to be the table's column set. When the two drift the header visibly rewrites
 * itself as the rows stream in — the flash the skeleton exists to prevent.
 */
describe('ITEMS_SKELETON_COLUMNS', () => {
  it('mirrors the items table columns, in order', () => {
    expect(ITEMS_SKELETON_COLUMNS.map((column) => column.label)).toEqual([
      'Name',
      'SKU',
      'Price',
      'Description',
    ])
  })

  it('matches the headers the loaded table renders', () => {
    expect(ITEMS_SKELETON_COLUMNS.map((column) => column.label)).toEqual(
      columns.map((column) => column.header)
    )
  })
})
