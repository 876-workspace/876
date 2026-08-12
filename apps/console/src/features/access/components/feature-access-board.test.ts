import { describe, expect, it } from 'vitest'

import type { AccessFlag } from './feature-access-board'
import { scopeIsLive } from './feature-access-board'

function flag(overrides: Partial<AccessFlag> = {}): AccessFlag {
  return {
    id: 'ftr_test',
    slug: 'billing_test',
    name: 'Test feature',
    enabled: true,
    child: false,
    orgOverrides: [],
    userOverrides: [],
    ...overrides,
  }
}

describe('scopeIsLive', () => {
  it('reports an enabled standalone feature as live', () => {
    expect(scopeIsLive([flag()])).toBe(true)
  })

  it('requires an enabled master and at least one enabled child for a group', () => {
    expect(
      scopeIsLive([
        flag({ id: 'master' }),
        flag({ id: 'child', child: true, enabled: false }),
      ])
    ).toBe(false)
    expect(
      scopeIsLive([
        flag({ id: 'master', enabled: false }),
        flag({ id: 'child', child: true }),
      ])
    ).toBe(false)
    expect(
      scopeIsLive([flag({ id: 'master' }), flag({ id: 'child', child: true })])
    ).toBe(true)
  })
})
