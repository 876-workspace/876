import { describe, expect, it } from 'vitest'

import {
  toStoredPermissionKeys,
  appPermissionCatalogs,
  consolePermissionCatalog,
  couriersPermissionCatalog,
  crmPermissionCatalog,
} from './catalogs'

const SYSTEM_ROLE_KEYS = [
  'apps:delete',
  'apps:list',
  'apps:read',
  'console:access',
  'console:apps',
  'console:billing',
  'console:danger-zone',
  'console:features',
  'console:organizations',
  'console:settings',
  'console:requests',
  'console:users',
  'console:widgets',
  'memberships:create',
  'memberships:delete',
  'memberships:list',
  'memberships:read',
  'memberships:update',
  'organizations:create',
  'organizations:delete',
  'organizations:list',
  'organizations:read',
  'organizations:search',
  'organizations:update',
  'roles:create',
  'roles:delete',
  'roles:list',
  'roles:read',
  'roles:update',
  'users:create',
  'users:delete',
  'users:list',
  'users:read',
  'users:search',
  'users:update',
] as const

const SORTED_CONSOLE_KEYS = [
  'apps:create',
  'apps:delete',
  'apps:list',
  'apps:read',
  'apps:update',
  'console:access',
  'console:apps',
  'console:billing',
  'console:danger-zone',
  'console:features',
  'console:organizations',
  'console:reports',
  'console:requests',
  'console:security',
  'console:settings',
  'console:storage',
  'console:users',
  'console:widgets',
  'memberships:create',
  'memberships:delete',
  'memberships:list',
  'memberships:read',
  'memberships:update',
  'organizations:create',
  'organizations:delete',
  'organizations:list',
  'organizations:read',
  'organizations:search',
  'organizations:update',
  'roles:create',
  'roles:delete',
  'roles:list',
  'roles:read',
  'roles:update',
  'team:invite',
  'team:list',
  'team:read',
  'team:revoke',
  'team:suspend',
  'team:update',
  'users:create',
  'users:delete',
  'users:list',
  'users:read',
  'users:search',
  'users:update',
] as const

describe('consolePermissionCatalog', () => {
  it('keeps every stored string permission key exactly as written', () => {
    const result = toStoredPermissionKeys([
      'console:access',
      'users:read',
      'console:requests',
    ])

    expect(result).toEqual(['console:access', 'users:read', 'console:requests'])
  })

  it('drops non-string entries from a malformed stored role row', () => {
    const result = toStoredPermissionKeys([
      'console:access',
      42,
      null,
      undefined,
      { key: 'users:read' },
      'users:read',
    ])

    expect(result).toEqual(['console:access', 'users:read'])
  })

  it('returns no keys when the stored value is not an array', () => {
    expect(toStoredPermissionKeys(null)).toEqual([])
    expect(toStoredPermissionKeys(undefined)).toEqual([])
    expect(toStoredPermissionKeys('console:access')).toEqual([])
    expect(toStoredPermissionKeys({ 0: 'console:access' })).toEqual([])
  })

  it('does not mutate the persisted permission array', () => {
    const stored = ['console:access', 'users:read']

    toStoredPermissionKeys(stored)

    expect(stored).toEqual(['console:access', 'users:read'])
  })

  it('never emits the retired support key from the canonical catalog', () => {
    expect(
      consolePermissionCatalog.permissions
        .map((permission) => permission.key)
        .filter((permission) => permission === 'console:support')
    ).toEqual([])
  })

  it('emits the canonical requests key from the Console catalog', () => {
    expect(
      consolePermissionCatalog.permissions
        .map((permission) => permission.key)
        .filter((permission) => permission === 'console:requests')
    ).toEqual(['console:requests'])
  })

  it('uses the verified Console app slug', () => {
    expect(consolePermissionCatalog.app).toBe('console')
  })

  it('registers Console under its real app slug', () => {
    expect(appPermissionCatalogs.console).toBe(consolePermissionCatalog)
  })

  it('keeps the exact declared module order', () => {
    expect(
      consolePermissionCatalog.modules.map((module) => module.key)
    ).toEqual([
      'console',
      'users',
      'organizations',
      'memberships',
      'apps',
      'roles',
      'team',
    ])
  })

  it('pins the full sorted Console permission-key snapshot', () => {
    expect(consolePermissionCatalog.permissions.map((row) => row.key)).toEqual(
      SORTED_CONSOLE_KEYS
    )
  })

  it('contains every permission currently granted by a Console system role', () => {
    const catalogKeys = new Set(
      consolePermissionCatalog.permissions.map((row) => row.key)
    )

    expect(SYSTEM_ROLE_KEYS.filter((key) => !catalogKeys.has(key))).toEqual([])
  })

  it('contains the navigation permissions introduced by the access standard', () => {
    const catalogKeys = new Set(
      consolePermissionCatalog.permissions.map((row) => row.key)
    )

    expect(
      [
        'console:security',
        'console:storage',
        'console:reports',
        'team:list',
        'roles:list',
      ].filter((key) => !catalogKeys.has(key))
    ).toEqual([])
  })

  it('marks every delete permission dangerous', () => {
    expect(
      consolePermissionCatalog.permissions
        .filter((row) => row.action === 'delete')
        .map((row) => [row.key, row.isDangerous])
    ).toEqual([
      ['apps:delete', true],
      ['memberships:delete', true],
      ['organizations:delete', true],
      ['roles:delete', true],
      ['users:delete', true],
    ])
  })

  it('marks console danger-zone access dangerous', () => {
    expect(
      consolePermissionCatalog.permissions.find(
        (row) => row.key === 'console:danger-zone'
      )?.isDangerous
    ).toBe(true)
  })

  it('does not mark ordinary update permissions dangerous', () => {
    expect(
      consolePermissionCatalog.permissions.find(
        (row) => row.key === 'users:update'
      )?.isDangerous
    ).toBe(false)
  })

  it('contains no duplicate permission keys', () => {
    const keys = consolePermissionCatalog.permissions.map((row) => row.key)

    expect(new Set(keys).size).toBe(46)
  })

  it('assigns module positions from declaration order', () => {
    expect(
      consolePermissionCatalog.modules.map((module) => module.position)
    ).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it('assigns permission positions from action declaration order', () => {
    expect(
      consolePermissionCatalog.modules
        .find((module) => module.key === 'users')
        ?.permissions.map((permission) => [
          permission.action,
          permission.position,
        ])
    ).toEqual([
      ['read', 0],
      ['list', 1],
      ['search', 2],
      ['create', 3],
      ['update', 4],
      ['delete', 5],
    ])
  })

  it('uses colon-delimited persisted keys for every Console permission', () => {
    expect(
      consolePermissionCatalog.permissions.filter((row) =>
        row.key.includes('.')
      )
    ).toEqual([])
  })

  it('keeps every Console key derived from its module and action', () => {
    expect(
      consolePermissionCatalog.permissions.filter(
        (row) => row.key !== `${row.moduleKey}:${row.action}`
      )
    ).toEqual([])
  })

  it('keeps product-app catalog keys dot-delimited', () => {
    expect([
      crmPermissionCatalog.permissions[0]?.key,
      couriersPermissionCatalog.permissions[0]?.key,
    ]).toEqual(['calendars.create', 'customers.create'])
  })

  it('keeps catalog labels non-empty after normalization', () => {
    expect(
      consolePermissionCatalog.permissions.filter(
        (row) => row.label.trim().length === 0
      )
    ).toEqual([])
  })
})
