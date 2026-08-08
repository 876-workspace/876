import { describe, expect, it } from 'vitest'
import type { ColumnDef } from '@tanstack/react-table'
import type { DataTableSkeletonColumn } from '@876/ui/data-table-skeleton'

import { columns as customerColumns } from './customers/_components/customers-table'
import { CUSTOMERS_SKELETON_COLUMNS } from './customers/_components/customers-skeleton-columns'
import { columns as itemColumns } from './items/_components/items-table'
import { ITEMS_SKELETON_COLUMNS } from './items/_components/items-skeleton-columns'

/**
 * A `loading.tsx` fallback renders the real header row, so its column set has
 * to be the table's column set. When the two drift the header visibly rewrites
 * itself as the rows stream in — the flash the skeleton exists to prevent.
 * These assertions are what stop a column rename from silently reintroducing it.
 */
function headersOf(columns: ColumnDef<never, unknown>[]): string[] {
  return columns.map((column) => {
    const header = column.header
    if (typeof header !== 'string')
      throw new Error(
        'Expected a string header; a non-string header cannot be mirrored by DataTableSkeleton.'
      )

    return header
  })
}

function labelsOf(columns: DataTableSkeletonColumn[]): string[] {
  return columns.map((column) => column.label)
}

describe('list skeleton columns', () => {
  it('mirrors the customers table columns, in order', () => {
    expect(labelsOf(CUSTOMERS_SKELETON_COLUMNS)).toEqual([
      'Name',
      'Company',
      'Email',
      'Phone',
    ])
    expect(labelsOf(CUSTOMERS_SKELETON_COLUMNS)).toEqual(
      headersOf(customerColumns as ColumnDef<never, unknown>[])
    )
  })

  it('mirrors the items table columns, in order', () => {
    expect(labelsOf(ITEMS_SKELETON_COLUMNS)).toEqual([
      'Name',
      'SKU',
      'Price',
      'Description',
    ])
    expect(labelsOf(ITEMS_SKELETON_COLUMNS)).toEqual(
      headersOf(itemColumns as ColumnDef<never, unknown>[])
    )
  })
})
