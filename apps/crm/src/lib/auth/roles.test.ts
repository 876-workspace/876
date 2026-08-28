import { describe, expect, it } from 'vitest'

import { canCreatePrivateRequestNote } from './roles'

describe('canCreatePrivateRequestNote', () => {
  it.each(['owner', 'admin', 'superadmin', 'super_admin'])(
    'allows the %s role',
    (role) => {
      expect(canCreatePrivateRequestNote(role)).toBe(true)
    }
  )

  it.each(['member', 'billing_manager', 'custom_role'])(
    'rejects the %s role',
    (role) => {
      expect(canCreatePrivateRequestNote(role)).toBe(false)
    }
  )
})
