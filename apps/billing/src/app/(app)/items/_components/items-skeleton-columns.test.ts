import { describe, expect, it } from 'vitest'

import { ITEMS_SKELETON_COLUMNS } from './items-skeleton-columns'

describe('ITEMS_SKELETON_COLUMNS', () => {
  it('has 6 columns', () => {
    expect(ITEMS_SKELETON_COLUMNS).toHaveLength(6)
  })

  it('has expected labels in order', () => {
    expect(ITEMS_SKELETON_COLUMNS.map((c) => c.label)).toEqual([
      'Item',
      'Default price',
      'Tax',
      'Prices',
      'Status',
      'Actions',
    ])
  })

  it('Item uses avatar, Status uses badge', () => {
    expect(ITEMS_SKELETON_COLUMNS[0]).toMatchObject({
      label: 'Item',
      cell: 'avatar',
    })
    expect(ITEMS_SKELETON_COLUMNS[4]).toMatchObject({
      label: 'Status',
      cell: 'badge',
    })
  })

  it('Actions column is srOnly with width 3rem', () => {
    const actions = ITEMS_SKELETON_COLUMNS.find((c) => c.label === 'Actions')
    expect(actions).toEqual({ label: 'Actions', srOnly: true, width: '3rem' })
  })

  it('mirrors items-table headers', () => {
    // items-table: Item, Default price, Tax, Prices, Status, Actions
    expect(ITEMS_SKELETON_COLUMNS[1]?.label).toBe('Default price')
    expect(ITEMS_SKELETON_COLUMNS[2]?.label).toBe('Tax')
    expect(ITEMS_SKELETON_COLUMNS[3]?.label).toBe('Prices')
  })

  it('only Actions is srOnly', () => {
    const srOnly = ITEMS_SKELETON_COLUMNS.filter((c) => c.srOnly)
    expect(srOnly).toHaveLength(1)
    expect(srOnly[0]?.label).toBe('Actions')
  })

  it('only Actions has width defined', () => {
    const withWidth = ITEMS_SKELETON_COLUMNS.filter((c) => c.width)
    expect(withWidth).toHaveLength(1)
    expect(withWidth[0]?.width).toBe('3rem')
  })

  it('does not mutate original when copied', () => {
    const clone = [...ITEMS_SKELETON_COLUMNS]
    clone.pop()
    expect(ITEMS_SKELETON_COLUMNS).toHaveLength(6)
  })

  it('labels are unique', () => {
    const labels = ITEMS_SKELETON_COLUMNS.map((c) => c.label)
    expect(new Set(labels).size).toBe(labels.length)
  })
})
