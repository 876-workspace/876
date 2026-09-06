import { describe, expect, it } from 'vitest'

import {
  impliedPermissions,
  mergePermissions,
  partitionPermissions,
} from './permission-surface'
import type { FinancePermissionSurface, FinanceRoleSummary } from './types'

const surface: FinancePermissionSurface = {
  app: 'invoice',
  editable: [
    'billing:access',
    'customers:read',
    'customers:write',
    'sales:read',
    'sales:write',
  ],
  modules: [],
}
const role: FinanceRoleSummary = {
  id: 'role_alejandra',
  slug: 'bookkeeper',
  name: 'Bookkeeper',
  description: 'Records invoices.',
  permissions: ['billing:access', 'customers:read', 'banking:write'],
  isSystem: false,
  isDefault: false,
  memberCount: 0,
}

describe('permission surface helpers', () => {
  it('partitions editable permissions', () =>
    expect(partitionPermissions(role, surface).editable).toEqual([
      'billing:access',
      'customers:read',
    ]))
  it('partitions external permissions', () =>
    expect(partitionPermissions(role, surface).external).toEqual([
      'banking:write',
    ]))
  it('partitions an empty role', () =>
    expect(partitionPermissions({ permissions: [] }, surface)).toEqual({
      editable: [],
      external: [],
    }))
  it('treats unknown grants as external', () =>
    expect(
      partitionPermissions({ permissions: ['unknown:read'] }, surface).external
    ).toEqual(['unknown:read']))
  it('keeps duplicate grants in the display partition', () =>
    expect(
      partitionPermissions(
        { permissions: ['sales:read', 'sales:read'] },
        surface
      ).editable
    ).toEqual(['sales:read', 'sales:read']))
  it('merges and sorts permission sets', () =>
    expect(
      mergePermissions(['sales:read', 'billing:access'], ['banking:read'])
    ).toEqual(['banking:read', 'billing:access', 'sales:read']))
  it('deduplicates permissions when merging', () =>
    expect(
      mergePermissions(['sales:read', 'sales:read'], ['sales:read'])
    ).toEqual(['sales:read']))
  it('Invoice editing a Billing role preserves out-of-surface Billing grants', () =>
    expect(
      mergePermissions(
        ['billing:access', 'customers:read'],
        ['banking:read', 'subscriptions:write']
      )
    ).toEqual([
      'banking:read',
      'billing:access',
      'customers:read',
      'subscriptions:write',
    ]))
  it('adds billing access to an empty selection', () =>
    expect(impliedPermissions([], surface)).toEqual(['billing:access']))
  it('selecting write selects read', () =>
    expect(
      impliedPermissions(['customers:write'], surface, 'customers:write')
    ).toEqual(['billing:access', 'customers:read', 'customers:write']))
  it('clearing read clears write', () =>
    expect(
      impliedPermissions(['customers:write'], surface, 'customers:read')
    ).toEqual(['billing:access']))
  it('billing access cannot be removed', () =>
    expect(
      impliedPermissions(['customers:read'], surface, 'billing:access')
    ).toEqual(['billing:access', 'customers:read']))
  it('keeps matching read permission', () =>
    expect(
      impliedPermissions(['customers:read', 'customers:write'], surface)
    ).toEqual(['billing:access', 'customers:read', 'customers:write']))
  it('does not invent a read grant outside the editable surface', () =>
    expect(
      impliedPermissions(['banking:write'], surface, 'banking:write')
    ).toEqual(['banking:write', 'billing:access']))
  it('returns sorted grants', () =>
    expect(
      impliedPermissions(['sales:read', 'customers:read'], surface)
    ).toEqual(['billing:access', 'customers:read', 'sales:read']))
  it('does not mutate an input array', () => {
    const selected = ['sales:write']
    impliedPermissions(selected, surface, 'sales:write')
    expect(selected).toEqual(['sales:write'])
  })
  it('does not remove unrelated external grants', () =>
    expect(impliedPermissions(['banking:read'], surface)).toContain(
      'banking:read'
    ))
  it.each([['customers:write'], ['sales:write']])(
    'adds the read grant for %s',
    (permission) =>
      expect(impliedPermissions([permission], surface, permission)).toContain(
        permission.replace(':write', ':read')
      )
  )
})
