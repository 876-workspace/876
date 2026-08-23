import { describe, expect, it } from 'vitest'

import {
  billingPermissionValues,
  roleCreateBodySchema,
} from '../access.schemas'

/**
 * Handling a stored instrument is deliberately separable from recording a
 * receipt, so a bookkeeper can reconcile payments without being able to attach
 * or detach a customer's card.
 */
describe('payment-method permissions', () => {
  it('exists in the vocabulary as its own read/write pair', () => {
    expect(billingPermissionValues).toContain('payment_methods:read')
    expect(billingPermissionValues).toContain('payment_methods:write')
  })

  it('is distinct from the payments pair, not an alias for it', () => {
    expect(billingPermissionValues).toContain('payments:read')
    expect(billingPermissionValues).toContain('payments:write')
    expect(new Set(billingPermissionValues).size).toBe(
      billingPermissionValues.length
    )
  })

  it('accepts a role that can take money but not touch instruments', () => {
    const result = roleCreateBodySchema.safeParse({
      slug: 'bookkeeper',
      name: 'Bookkeeper',
      permissions: ['billing:access', 'payments:read', 'payments:write'],
    })

    expect(result.success).toBe(true)
  })

  it('accepts a role that can read instruments without managing them', () => {
    const result = roleCreateBodySchema.safeParse({
      slug: 'support',
      name: 'Support',
      permissions: ['billing:access', 'payment_methods:read'],
    })

    expect(result.success).toBe(true)
  })

  it('refuses write without the matching read, as for every other pair', () => {
    const result = roleCreateBodySchema.safeParse({
      slug: 'broken',
      name: 'Broken',
      permissions: ['billing:access', 'payment_methods:write'],
    })

    expect(result.success).toBe(false)
  })

  it('refuses a role that omits billing access entirely', () => {
    const result = roleCreateBodySchema.safeParse({
      slug: 'orphan',
      name: 'Orphan',
      permissions: ['payment_methods:read'],
    })

    expect(result.success).toBe(false)
  })
})
