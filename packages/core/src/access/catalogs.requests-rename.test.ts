import { describe, expect, it } from 'vitest'

import {
  adaptStoredConsolePermissions,
  consolePermissionCatalog,
  LEGACY_PERMISSION_ALIASES,
} from './catalogs'
import { resolveEffectivePermissions } from './index'

describe('Console requests permission rename', () => {
  it('declares the complete legacy alias vocabulary', () => {
    expect(LEGACY_PERMISSION_ALIASES).toEqual({
      'console:support': 'console:requests',
    })
  })

  it('emits requests and never support from the Console catalog', () => {
    const consoleKeys = consolePermissionCatalog.permissions
      .map((permission) => permission.key)
      .filter((key) => key.startsWith('console:'))

    expect(consoleKeys).toEqual([
      'console:access',
      'console:apps',
      'console:billing',
      'console:danger_zone',
      'console:features',
      'console:organizations',
      'console:reports',
      'console:requests',
      'console:security',
      'console:settings',
      'console:storage',
      'console:users',
      'console:widgets',
    ])
  })

  it('adapts a role containing only the legacy key', () => {
    const result = adaptStoredConsolePermissions(['console:support'])

    expect(result).toEqual(['console:requests'])
  })

  it('resolves an adapted legacy-only role to requests access', () => {
    const result = resolveEffectivePermissions({
      role: {
        permissions: adaptStoredConsolePermissions(['console:support']),
      },
      catalog: consolePermissionCatalog,
    })

    expect(result).toEqual(['console:requests'])
  })

  it('does not treat the legacy key as a canonical permission', () => {
    const result = resolveEffectivePermissions({
      role: { permissions: ['console:support'] },
      catalog: consolePermissionCatalog,
    })

    expect(result).toEqual([])
  })

  it('does not widen an unrelated stored permission', () => {
    const result = adaptStoredConsolePermissions(['users:read'])

    expect(result).toEqual(['users:read'])
  })

  it('matches only the exact persisted legacy key', () => {
    const result = adaptStoredConsolePermissions([
      'console:support ',
      'console:support:delete',
      'Console:Support',
    ])

    expect(result).toEqual([
      'console:support ',
      'console:support:delete',
      'Console:Support',
    ])
  })

  it('leaves the persisted role array unchanged', () => {
    const stored = ['console:support', 'users:read']

    adaptStoredConsolePermissions(stored)

    expect(stored).toEqual(['console:support', 'users:read'])
  })
})
