import { describe, expect, it } from 'vitest'

import { toRoleView } from './view'

describe('toRoleView', () => {
  it('maps a persisted role and caller-supplied member count', () => {
    const row = {
      name: 'support',
      displayName: 'Support',
      description: 'Handles customer support.',
      permissions: ['console:access', 'users:read'],
      isSystem: false,
    }

    const result = toRoleView(row, 7)

    expect(result).toEqual({ ...row, userCount: 7 })
  })
})
