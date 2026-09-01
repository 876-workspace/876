import { describe, expect, it } from 'vitest'

import { accessResolveBodySchema } from '../access.internal-routes'

/**
 * Regression anchor. The Billing app normalizes an organization role to the
 * canonical `super-admin` before calling this route, so a schema that accepted
 * only the legacy `super_admin` failed member-access resolution for every super
 * admin — and neither typecheck nor the app caught it, because the caller's
 * parameter is a plain string.
 */
describe('access resolve body', () => {
  const base = { tenantId: 'ten_kingston_1', userId: 'user_alejandra_1' }

  it('accepts the canonical super-admin role', () => {
    const result = accessResolveBodySchema.safeParse({
      ...base,
      organizationRole: 'super-admin',
    })

    expect(result.success).toBe(true)
  })

  it('still accepts the legacy super_admin role during the cutover', () => {
    const result = accessResolveBodySchema.safeParse({
      ...base,
      organizationRole: 'super_admin',
    })

    expect(result.success).toBe(true)
  })

  it.each(['admin', 'staff'] as const)('accepts the %s role', (role) => {
    const result = accessResolveBodySchema.safeParse({
      ...base,
      organizationRole: role,
    })

    expect(result.success).toBe(true)
  })

  it.each(['owner', 'agent', 'viewer', 'SUPER-ADMIN', '', 'super admin'])(
    'rejects %j, which is not an organization role',
    (role) => {
      const result = accessResolveBodySchema.safeParse({
        ...base,
        organizationRole: role,
      })

      expect(result.success).toBe(false)
    }
  )

  it('rejects a body missing the organization role', () => {
    const result = accessResolveBodySchema.safeParse(base)

    expect(result.success).toBe(false)
  })
})
