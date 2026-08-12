import { describe, expect, it } from 'vitest'

import { CUSTOMERS_SKELETON_COLUMNS } from './customers-skeleton-columns'

describe('CUSTOMERS_SKELETON_COLUMNS', () => {
  it('has 5 columns', () => {
    expect(CUSTOMERS_SKELETON_COLUMNS).toHaveLength(5)
  })

  it('has expected labels in order', () => {
    expect(CUSTOMERS_SKELETON_COLUMNS.map((c) => c.label)).toEqual([
      'Customer',
      'Company',
      'Contact',
      'Phone',
      'Receivables',
    ])
  })

  it('Customer column uses avatar cell', () => {
    expect(CUSTOMERS_SKELETON_COLUMNS[0]).toMatchObject({
      label: 'Customer',
      cell: 'avatar',
    })
  })

  it('receivables column is text without badge or srOnly', () => {
    const receivables = CUSTOMERS_SKELETON_COLUMNS.find(
      (c) => c.label === 'Receivables'
    )
    expect(receivables).toBeDefined()
    expect(receivables?.cell).toBeUndefined()
    expect(receivables?.srOnly).toBeUndefined()
  })

  it('no column is srOnly', () => {
    expect(CUSTOMERS_SKELETON_COLUMNS.every((c) => !c.srOnly)).toBe(true)
  })

  it('mirrors customers-table headers', () => {
    // customers-table headers: Customer, Company, Contact, Phone, Receivables
    const tableHeaders = [
      'Customer',
      'Company',
      'Contact',
      'Phone',
      'Receivables',
    ]
    expect(CUSTOMERS_SKELETON_COLUMNS.map((c) => c.label)).toEqual(tableHeaders)
  })

  it('does not include widths by default', () => {
    expect(CUSTOMERS_SKELETON_COLUMNS.every((c) => c.width === undefined)).toBe(
      true
    )
  })

  it('is importable as DataTableSkeletonColumn without mutation', () => {
    const clone = [...CUSTOMERS_SKELETON_COLUMNS]
    clone.push({ label: 'Extra' })
    expect(CUSTOMERS_SKELETON_COLUMNS).toHaveLength(5)
  })

  it('labels are non-empty strings', () => {
    for (const col of CUSTOMERS_SKELETON_COLUMNS) {
      expect(typeof col.label).toBe('string')
      expect(col.label.length).toBeGreaterThan(0)
    }
  })
})
