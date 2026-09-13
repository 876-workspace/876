import { describe, expect, it } from 'vitest'

import { resolveItemStatusFilter } from './items-list-config'

describe('resolveItemStatusFilter', () => {
  it('resolves an absent status to all', () => {
    expect(resolveItemStatusFilter(null)).toBe('all')
  })

  it('resolves an undefined status to all', () => {
    expect(resolveItemStatusFilter(undefined)).toBe('all')
  })

  it('resolves active to active', () => {
    expect(resolveItemStatusFilter('active')).toBe('active')
  })

  it('resolves inactive to inactive', () => {
    expect(resolveItemStatusFilter('inactive')).toBe('inactive')
  })

  it('resolves an unknown status to all', () => {
    expect(resolveItemStatusFilter('archived')).toBe('all')
  })
})
