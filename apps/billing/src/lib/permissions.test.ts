import { describe, expect, it } from 'vitest'

import { BILLING_PERMISSION_VALUES } from '@/types/permission-values'
import type { Permission } from '@/types/access'

import {
  BILLING_PERMISSION_GROUPS,
  BILLING_SYSTEM_ROLES,
  isPermission,
  togglePermission,
} from './permissions'

const INVALID_PERMISSIONS = [
  '',
  'billing',
  'billing:write',
  'users:read',
  'CATALOG:READ',
  '__proto__',
] as const

describe('Billing permissions', () => {
  it.each(BILLING_PERMISSION_VALUES)(
    'accepts configured permission %s',
    (value) => {
      expect(isPermission(value)).toBe(true)
    }
  )

  it.each(INVALID_PERMISSIONS)('rejects unknown permission %j', (value) => {
    expect(isPermission(value)).toBe(false)
  })

  it('does not allow Billing access to be toggled off', () => {
    const current = new Set<Permission>(['billing:access'])

    const result = togglePermission(current, 'billing:access')

    expect(result).toEqual(new Set(['billing:access']))
    expect(result).not.toBe(current)
  })

  it('removes write access when its read dependency is removed', () => {
    const current = new Set<Permission>([
      'billing:access',
      'customers:read',
      'customers:write',
    ])

    const result = togglePermission(current, 'customers:read')

    expect(result).toEqual(new Set(['billing:access']))
    expect(current).toEqual(
      new Set(['billing:access', 'customers:read', 'customers:write'])
    )
  })

  it('removes write access without removing read access', () => {
    const current = new Set<Permission>([
      'billing:access',
      'customers:read',
      'customers:write',
    ])

    const result = togglePermission(current, 'customers:write')

    expect(result).toEqual(new Set(['billing:access', 'customers:read']))
  })

  it('adds read access when write access is enabled', () => {
    const current = new Set<Permission>(['billing:access'])

    const result = togglePermission(current, 'catalog:write')

    expect(result).toEqual(
      new Set(['billing:access', 'catalog:write', 'catalog:read'])
    )
  })

  it('adds read access without unrelated changes', () => {
    const current = new Set<Permission>(['billing:access'])

    const result = togglePermission(current, 'catalog:read')

    expect(result).toEqual(new Set(['billing:access', 'catalog:read']))
  })

  it('defines unique built-in roles with one default viewer role', () => {
    expect(BILLING_SYSTEM_ROLES.map((role) => role.slug)).toEqual([
      'owner',
      'admin',
      'accountant',
      'viewer',
    ])
    expect(
      BILLING_SYSTEM_ROLES.filter((role) => role.isDefault).map(
        (role) => role.slug
      )
    ).toEqual(['viewer'])
  })

  it('grants every permission to owner and admin', () => {
    expect(BILLING_SYSTEM_ROLES[0].permissions).toEqual(
      BILLING_PERMISSION_VALUES
    )
    expect(BILLING_SYSTEM_ROLES[1].permissions).toEqual(
      BILLING_PERMISSION_VALUES
    )
  })

  it('keeps accountant and viewer defaults aligned with migrated roles', () => {
    const accountant = BILLING_SYSTEM_ROLES.find(
      (role) => role.slug === 'accountant'
    )
    const viewer = BILLING_SYSTEM_ROLES.find((role) => role.slug === 'viewer')

    expect(accountant?.permissions).toEqual(
      expect.arrayContaining([
        'vendors:write',
        'purchases:write',
        'banking:write',
        'payments:write',
      ])
    )
    expect(viewer?.permissions).toEqual(
      expect.arrayContaining([
        'vendors:read',
        'purchases:read',
        'banking:read',
        'payments:read',
      ])
    )
  })

  it('keeps role and editor permissions inside the canonical catalog', () => {
    const usedPermissions = [
      ...BILLING_SYSTEM_ROLES.flatMap((role) => role.permissions),
      ...BILLING_PERMISSION_GROUPS.flatMap((group) =>
        group.permissions.map((permission) => permission.value)
      ),
    ]

    expect(usedPermissions.every(isPermission)).toBe(true)
    expect(
      new Set(
        BILLING_PERMISSION_GROUPS.flatMap((group) =>
          group.permissions.map((permission) => permission.value)
        )
      )
    ).toEqual(new Set(BILLING_PERMISSION_VALUES))
  })
})
