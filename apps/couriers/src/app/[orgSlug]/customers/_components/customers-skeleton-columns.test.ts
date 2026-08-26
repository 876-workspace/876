import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'

import { columns } from './customers-table'
import { CUSTOMERS_SKELETON_COLUMNS } from './customers-skeleton-columns'

/**
 * The `loading.tsx` fallback renders the real header row, so its column set has
 * to be the table's column set. When the two drift the header visibly rewrites
 * itself as the rows stream in — the flash the skeleton exists to prevent.
 */
/**
 * The columns are sortable, so `header` is a render function rather than a
 * string. Read the title it hands `DataTableColumnHeader` — comparing against
 * the function itself only ever asserts that both sides are functions.
 */
function headerTitles(): string[] {
  return columns.map((column) => {
    const header = column.header
    if (typeof header === 'string') return header
    if (typeof header !== 'function')
      throw new Error('A column header must be a string or a render function.')

    const rendered = (header as (context: unknown) => ReactElement)({
      column: {},
      header: {},
      table: {},
    })
    const { title } = rendered.props as { title?: string }
    if (!title) throw new Error('A column header must render a title.')

    return title
  })
}

describe('CUSTOMERS_SKELETON_COLUMNS', () => {
  it('mirrors the customers table columns, in order', () => {
    expect(CUSTOMERS_SKELETON_COLUMNS.map((column) => column.label)).toEqual([
      'Name',
      'Company',
      'Email',
      'Phone',
      'Status',
    ])
  })

  it('matches the headers the loaded table renders', () => {
    expect(CUSTOMERS_SKELETON_COLUMNS.map((column) => column.label)).toEqual(
      headerTitles()
    )
  })
})
