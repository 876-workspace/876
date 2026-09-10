import { describe, expect, it } from 'vitest'

import { PRICES_SKELETON_COLUMNS } from './prices-skeleton-columns'

describe('PRICES_SKELETON_COLUMNS', () => {
  it('has 6 columns', () => {
    expect(PRICES_SKELETON_COLUMNS).toHaveLength(6)
  })

  it('has expected labels in order', () => {
    expect(PRICES_SKELETON_COLUMNS.map((column) => column.label)).toEqual([
      'Catalog target',
      'Amount',
      'Cadence',
      'Model',
      'Status',
      'Actions',
    ])
  })

  it('uses a badge cell for Status', () => {
    expect(PRICES_SKELETON_COLUMNS[4]).toMatchObject({
      label: 'Status',
      cell: 'badge',
    })
  })

  it('uses an sr-only Actions column with the table action width', () => {
    expect(PRICES_SKELETON_COLUMNS[5]).toEqual({
      label: 'Actions',
      srOnly: true,
      width: '3rem',
    })
  })
})
