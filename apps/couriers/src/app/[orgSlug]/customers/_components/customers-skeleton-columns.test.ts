import { describe, expect, it } from 'vitest'

import { columns } from './customers-table'
import { CUSTOMERS_SKELETON_COLUMNS } from './customers-skeleton-columns'

/**
 * The `loading.tsx` fallback renders the real header row, so its column set has
 * to be the table's column set. When the two drift the header visibly rewrites
 * itself as the rows stream in — the flash the skeleton exists to prevent.
 */
describe('CUSTOMERS_SKELETON_COLUMNS', () => {
  it('mirrors the customers table columns, in order', () => {
    expect(CUSTOMERS_SKELETON_COLUMNS.map((column) => column.label)).toEqual([
      'Name',
      'Company',
      'Email',
      'Phone',
    ])
  })

  it('matches the headers the loaded table renders', () => {
    expect(CUSTOMERS_SKELETON_COLUMNS.map((column) => column.label)).toEqual(
      columns.map((column) => column.header)
    )
  })
})
