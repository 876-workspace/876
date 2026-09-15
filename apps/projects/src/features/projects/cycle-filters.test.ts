import { describe, expect, it } from 'vitest'

import { parseCycleFilters } from './cycle-filters'

describe('parseCycleFilters', () => {
  it('defaults to all', () => {
    expect(parseCycleFilters({}).values.status).toBe('all')
  })

  it('parses active', () => {
    expect(parseCycleFilters({ status: 'active' }).status).toBe('active')
  })

  it('ignores unknown statuses', () => {
    expect(parseCycleFilters({ status: 'archived' }).status).toBeUndefined()
  })
})
