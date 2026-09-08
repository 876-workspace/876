import { describe, expect, it } from 'vitest'

import {
  FINANCE_PERMISSION_MODULES,
  FINANCE_PERMISSION_VALUES,
  financePermissionSurface,
} from '@876/core/access/finance-catalog'

import { billingPermissionValues } from '../access.schemas'

/**
 * `billingPermissionValues` must stay a literal tuple so `z.enum` produces the
 * union every route and serializer is typed against, which is why it is not
 * derived from the catalog at runtime. This test is what keeps the two honest:
 * a permission added to one and not the other fails here rather than at a
 * customer's role editor.
 */
describe('finance permission catalog', () => {
  it('declares exactly the permissions the API validates', () => {
    expect([...billingPermissionValues].sort()).toEqual([
      ...FINANCE_PERMISSION_VALUES,
    ])
  })

  it('assigns every permission to exactly one module', () => {
    const owners = new Map<string, string[]>()
    for (const permissionModule of FINANCE_PERMISSION_MODULES)
      for (const permission of permissionModule.permissions)
        owners.set(permission.key, [
          ...(owners.get(permission.key) ?? []),
          permissionModule.key,
        ])

    const duplicated = [...owners.entries()].filter(
      ([, modules]) => modules.length > 1
    )
    expect(duplicated).toEqual([])
    expect(owners.size).toBe(FINANCE_PERMISSION_VALUES.length)
  })

  it('gives 876 Invoice no subscriptions, banking, purchases or vendors keys', () => {
    const invoice = financePermissionSurface('invoice')
    expect(
      invoice.editable.filter((permission) =>
        /^(subscriptions|banking|purchases|vendors|payment_methods|currencies):/.test(
          permission
        )
      )
    ).toEqual([])
  })

  it('makes the Billing surface a strict superset of the Invoice surface', () => {
    const billing = financePermissionSurface('billing')
    const invoice = financePermissionSurface('invoice')

    expect(billing.editable).toEqual([...FINANCE_PERMISSION_VALUES])
    expect(
      invoice.editable.every((permission) =>
        billing.editable.includes(permission)
      )
    ).toBe(true)
    expect(invoice.editable.length).toBeLessThan(billing.editable.length)
  })

  it('keeps workspace access on every surface', () => {
    expect(financePermissionSurface('billing').editable).toContain(
      'billing:access'
    )
    expect(financePermissionSurface('invoice').editable).toContain(
      'billing:access'
    )
  })
})
