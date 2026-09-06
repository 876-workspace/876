import { describe, expect, it } from 'vitest'

import {
  FINANCE_PERMISSION_MODULES,
  FINANCE_PERMISSION_VALUES,
  financePermissionSurface,
  mergeFinancePermissions,
  partitionFinancePermissions,
  withImpliedFinancePermissions,
  withoutFinancePermission,
} from './finance-catalog'

const invoice = financePermissionSurface('invoice')
const billing = financePermissionSurface('billing')

describe('financePermissionSurface', () => {
  it('returns the full catalog for Billing', () => {
    expect(billing.app).toBe('billing')
    expect(billing.editable).toEqual([...FINANCE_PERMISSION_VALUES])
  })

  it('omits Billing-only modules from the Invoice surface', () => {
    const keys = invoice.modules.map((module) => module.key)
    expect(keys).not.toContain('subscriptions')
    expect(keys).not.toContain('banking')
    expect(keys).not.toContain('purchases')
    expect(keys).not.toContain('vendors')
    expect(keys).toContain('customers')
    expect(keys).toContain('sales')
  })

  it('returns a copy so a caller cannot mutate the catalog', () => {
    const first = financePermissionSurface('invoice')
    first.modules[0]!.permissions.push({ key: 'x:read', label: 'X' })
    expect(financePermissionSurface('invoice').modules[0]!.permissions).toEqual(
      FINANCE_PERMISSION_MODULES[0]!.permissions
    )
  })
})

describe('partitionFinancePermissions', () => {
  it('separates permissions the surface cannot edit', () => {
    const result = partitionFinancePermissions(
      ['customers:read', 'subscriptions:write', 'banking:read'],
      invoice
    )
    expect(result.editable).toEqual(['customers:read'])
    expect(result.external).toEqual(['banking:read', 'subscriptions:write'])
  })

  it('reports nothing external when the surface owns everything', () => {
    const result = partitionFinancePermissions(
      ['customers:read', 'subscriptions:write'],
      billing
    )
    expect(result.external).toEqual([])
    expect(result.editable).toEqual(['customers:read', 'subscriptions:write'])
  })

  it('handles an empty permission list', () => {
    expect(partitionFinancePermissions([], invoice)).toEqual({
      editable: [],
      external: [],
    })
  })
})

describe('mergeFinancePermissions', () => {
  it('preserves Billing grants when Invoice saves a shared role', () => {
    const role = ['billing:access', 'customers:read', 'subscriptions:write']
    const { external } = partitionFinancePermissions(role, invoice)

    const saved = mergeFinancePermissions(
      ['billing:access', 'customers:read', 'customers:write'],
      external
    )

    expect(saved).toContain('subscriptions:write')
    expect(saved).toEqual([
      'billing:access',
      'customers:read',
      'customers:write',
      'subscriptions:write',
    ])
  })

  it('deduplicates an overlapping selection', () => {
    expect(
      mergeFinancePermissions(['customers:read'], ['customers:read'])
    ).toEqual(['customers:read'])
  })
})

describe('withImpliedFinancePermissions', () => {
  it('adds the matching read for every write', () => {
    expect(withImpliedFinancePermissions(['customers:write'])).toEqual([
      'billing:access',
      'customers:read',
      'customers:write',
    ])
  })

  it('always grants workspace access', () => {
    expect(withImpliedFinancePermissions([])).toEqual(['billing:access'])
  })

  it('leaves an already-complete selection unchanged', () => {
    const input = ['billing:access', 'sales:read', 'sales:write']
    expect(withImpliedFinancePermissions(input)).toEqual(input)
  })
})

describe('withoutFinancePermission', () => {
  it('clears the write when its read is cleared', () => {
    expect(
      withoutFinancePermission(
        ['billing:access', 'sales:read', 'sales:write'],
        'sales:read'
      )
    ).toEqual(['billing:access'])
  })

  it('keeps the read when only the write is cleared', () => {
    expect(
      withoutFinancePermission(
        ['billing:access', 'sales:read', 'sales:write'],
        'sales:write'
      )
    ).toEqual(['billing:access', 'sales:read'])
  })

  it('refuses to remove workspace access', () => {
    expect(
      withoutFinancePermission(['billing:access'], 'billing:access')
    ).toEqual(['billing:access'])
  })
})
