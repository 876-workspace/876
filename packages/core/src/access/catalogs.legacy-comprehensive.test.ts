import { describe, expect, it } from 'vitest'

import {
  adaptStoredConsolePermissions,
  consolePermissionCatalog,
  couriersPermissionCatalog,
  crmPermissionCatalog,
  LEGACY_PERMISSION_ALIASES,
} from './catalogs'
import {
  defineAppPermissionCatalog,
  resolveEffectivePermissions,
} from './index'

describe('LEGACY_PERMISSION_ALIASES — contract', () => {
  it('exposes exactly one legacy mapping', () => {
    expect(Object.keys(LEGACY_PERMISSION_ALIASES)).toEqual(['console:support'])
  })

  it('maps support to requests', () => {
    expect(LEGACY_PERMISSION_ALIASES['console:support']).toBe(
      'console:requests'
    )
  })

  it('is not invertible — requests does not map back to support', () => {
    expect(LEGACY_PERMISSION_ALIASES['console:requests']).toBeUndefined()
  })

  it('contains only canonical catalog target', () => {
    const target = LEGACY_PERMISSION_ALIASES['console:support']
    const catalogKeys = new Set(
      consolePermissionCatalog.permissions.map((p) => p.key)
    )
    expect(catalogKeys.has(target)).toBe(true)
  })

  it('source key is absent from canonical catalog', () => {
    const source = 'console:support'
    const catalogKeys = new Set(
      consolePermissionCatalog.permissions.map((p) => p.key)
    )
    expect(catalogKeys.has(source)).toBe(false)
  })

  it('is a plain object with no prototype pollution', () => {
    expect(Object.getPrototypeOf(LEGACY_PERMISSION_ALIASES)).toBe(
      Object.prototype
    )
    expect(
      Object.prototype.hasOwnProperty.call(
        LEGACY_PERMISSION_ALIASES,
        '__proto__'
      )
    ).toBe(false)
  })

  it('does not contain constructor or __proto__ keys as own properties', () => {
    expect(
      Object.prototype.hasOwnProperty.call(
        LEGACY_PERMISSION_ALIASES,
        '__proto__'
      )
    ).toBe(false)
    expect(
      Object.prototype.hasOwnProperty.call(
        LEGACY_PERMISSION_ALIASES,
        'constructor'
      )
    ).toBe(false)
  })
})

describe('adaptStoredConsolePermissions — happy paths', () => {
  it('adapts single legacy key', () => {
    expect(adaptStoredConsolePermissions(['console:support'])).toEqual([
      'console:requests',
    ])
  })

  it('preserves single canonical key', () => {
    expect(adaptStoredConsolePermissions(['console:requests'])).toEqual([
      'console:requests',
    ])
  })

  it('adapts legacy while preserving surrounding permissions in order', () => {
    expect(
      adaptStoredConsolePermissions([
        'users:read',
        'console:support',
        'console:access',
      ])
    ).toEqual(['users:read', 'console:requests', 'console:access'])
  })

  it('handles multiple legacy keys interleaved', () => {
    expect(
      adaptStoredConsolePermissions([
        'console:support',
        'users:read',
        'console:support',
      ])
    ).toEqual(['console:requests', 'users:read', 'console:requests'])
  })

  it('preserves unrelated keys exactly', () => {
    expect(
      adaptStoredConsolePermissions([
        'legacy:root',
        'users:read',
        'console:access',
      ])
    ).toEqual(['legacy:root', 'users:read', 'console:access'])
  })

  it('preserves empty array', () => {
    expect(adaptStoredConsolePermissions([])).toEqual([])
  })

  it('returns empty array for non-array string input', () => {
    expect(
      adaptStoredConsolePermissions('console:support' as unknown as string[])
    ).toEqual([])
  })

  it('returns empty array for null', () => {
    expect(adaptStoredConsolePermissions(null)).toEqual([])
  })

  it('returns empty array for undefined', () => {
    expect(adaptStoredConsolePermissions(undefined)).toEqual([])
  })

  it('returns empty array for number', () => {
    expect(adaptStoredConsolePermissions(42 as unknown as string[])).toEqual([])
  })

  it('returns empty array for plain object', () => {
    expect(adaptStoredConsolePermissions({} as unknown as string[])).toEqual([])
  })

  it('returns empty array for Set', () => {
    expect(
      adaptStoredConsolePermissions(
        new Set(['console:support']) as unknown as string[]
      )
    ).toEqual([])
  })

  it('filters out non-string values', () => {
    expect(
      adaptStoredConsolePermissions([
        'console:support',
        42,
        null,
        undefined,
        {},
        true,
      ] as unknown as string[])
    ).toEqual(['console:requests'])
  })

  it('filters sparse holes without throwing', () => {
    const sparse: string[] = []
    sparse[1] = 'console:support'
    expect(adaptStoredConsolePermissions(sparse)).toEqual(['console:requests'])
  })

  it('does not mutate input array', () => {
    const stored = ['console:support', 'users:read']
    const copy = [...stored]
    adaptStoredConsolePermissions(stored)
    expect(stored).toEqual(copy)
  })

  it('does not mutate input array reference — returns new array', () => {
    const stored = ['console:support']
    const result = adaptStoredConsolePermissions(stored)
    expect(result).not.toBe(stored)
  })

  it('is idempotent — second adaptation is stable', () => {
    const first = adaptStoredConsolePermissions(['console:support'])
    const second = adaptStoredConsolePermissions(first)
    expect(second).toEqual(['console:requests'])
  })

  it('does not double-map canonical key', () => {
    const result = adaptStoredConsolePermissions([
      'console:requests',
      'console:support',
    ])
    expect(result).toEqual(['console:requests', 'console:requests'])
  })

  it('preserves case sensitivity — Console:Support not adapted', () => {
    expect(adaptStoredConsolePermissions(['Console:Support'])).toEqual([
      'Console:Support',
    ])
  })

  it('preserves whitespace-padded key — not adapted', () => {
    expect(adaptStoredConsolePermissions([' console:support'])).toEqual([
      ' console:support',
    ])
    expect(adaptStoredConsolePermissions(['console:support '])).toEqual([
      'console:support ',
    ])
  })

  it('does not adapt prefix with extra suffix', () => {
    expect(adaptStoredConsolePermissions(['console:support:extra'])).toEqual([
      'console:support:extra',
    ])
  })

  it('handles empty string permission', () => {
    expect(adaptStoredConsolePermissions([''])).toEqual([''])
  })

  it('handles duplicate legacy keys', () => {
    expect(
      adaptStoredConsolePermissions(['console:support', 'console:support'])
    ).toEqual(['console:requests', 'console:requests'])
  })

  it('handles 1000-entry stress without throwing', () => {
    const large = Array.from({ length: 1000 }, (_, i) =>
      i % 2 === 0 ? 'console:support' : 'users:read'
    )
    const result = adaptStoredConsolePermissions(large)
    expect(result).toHaveLength(1000)
    expect(result[0]).toBe('console:requests')
    expect(result[1]).toBe('users:read')
  })

  it('handles __proto__ string without pollution', () => {
    const result = adaptStoredConsolePermissions([
      '__proto__',
      'console:support',
    ])
    expect(result).toEqual(['__proto__', 'console:requests'])
    expect(
      Object.prototype.hasOwnProperty.call(
        LEGACY_PERMISSION_ALIASES,
        '__proto__'
      )
    ).toBe(false)
  })

  it('handles Symbol-like strings', () => {
    expect(adaptStoredConsolePermissions(['Symbol(support)'])).toEqual([
      'Symbol(support)',
    ])
  })

  it('handles very long permission key without adapting', () => {
    const long = 'a'.repeat(200)
    expect(adaptStoredConsolePermissions([long])).toEqual([long])
  })

  it('preserves order of mixed valid and invalid entries', () => {
    const input = [
      'console:access',
      null as unknown as string,
      'console:support',
      123 as unknown as string,
      'users:read',
    ]
    expect(adaptStoredConsolePermissions(input)).toEqual([
      'console:access',
      'console:requests',
      'users:read',
    ])
  })
})

describe('adaptStoredConsolePermissions — catalog integration', () => {
  it('adapted legacy key passes catalog intersection', () => {
    const adapted = adaptStoredConsolePermissions(['console:support'])
    const effective = resolveEffectivePermissions({
      role: { permissions: adapted },
      catalog: consolePermissionCatalog,
    })
    expect(effective).toEqual(['console:requests'])
  })

  it('unadapted legacy key fails catalog intersection', () => {
    const effective = resolveEffectivePermissions({
      role: { permissions: ['console:support'] },
      catalog: consolePermissionCatalog,
    })
    expect(effective).toEqual([])
  })

  it('mixed legacy and stale keys — only live catalog keys survive', () => {
    const adapted = adaptStoredConsolePermissions([
      'console:support',
      'legacy:root',
      'console:access',
    ])
    const effective = resolveEffectivePermissions({
      role: { permissions: adapted },
      catalog: consolePermissionCatalog,
    })
    expect(effective).toEqual(['console:access', 'console:requests'])
  })

  it('does not grant extra permissions when catalog is empty', () => {
    const adapted = adaptStoredConsolePermissions(['console:support'])
    const effective = resolveEffectivePermissions({
      role: { permissions: adapted },
      catalog: [],
    })
    expect(effective).toEqual([])
  })

  it('works with grants and denies layered on top', () => {
    const adapted = adaptStoredConsolePermissions(['users:read'])
    const effective = resolveEffectivePermissions({
      role: { permissions: adapted },
      grants: ['console:requests'],
      denies: ['users:read'],
      catalog: consolePermissionCatalog,
    })
    expect(effective).toEqual(['console:requests'])
  })
})

describe('consolePermissionCatalog — immutability and shape', () => {
  it('has exactly 46 permissions', () => {
    expect(consolePermissionCatalog.permissions).toHaveLength(46)
  })

  it('is sorted strictly ascending', () => {
    const keys = consolePermissionCatalog.permissions.map((p) => p.key)
    const sorted = [...keys].sort((a, b) => a.localeCompare(b))
    expect(keys).toEqual(sorted)
  })

  it('contains no dot-delimited keys', () => {
    expect(
      consolePermissionCatalog.permissions.some((p) => p.key.includes('.'))
    ).toBe(false)
  })

  it('every key equals moduleKey:action', () => {
    for (const p of consolePermissionCatalog.permissions) {
      expect(p.key).toBe(`${p.moduleKey}:${p.action}`)
    }
  })

  it('every permission has non-empty trimmed label', () => {
    for (const p of consolePermissionCatalog.permissions) {
      expect(p.label.trim().length).toBeGreaterThan(0)
      expect(p.label).toBe(p.label.trim())
    }
  })

  it('has 7 modules in declared order', () => {
    expect(consolePermissionCatalog.modules.map((m) => m.key)).toEqual([
      'console',
      'users',
      'organizations',
      'memberships',
      'apps',
      'roles',
      'team',
    ])
  })

  it('module positions are sequential', () => {
    expect(consolePermissionCatalog.modules.map((m) => m.position)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ])
  })

  it('danger_zone and delete are dangerous, others not', () => {
    for (const p of consolePermissionCatalog.permissions) {
      const expected = p.action === 'delete' || p.action === 'danger_zone'
      expect(p.isDangerous).toBe(expected)
    }
  })

  it('product catalogs remain dot-delimited', () => {
    expect(
      crmPermissionCatalog.permissions.every((p) => p.key.includes('.'))
    ).toBe(true)
    expect(
      couriersPermissionCatalog.permissions.every((p) => p.key.includes('.'))
    ).toBe(true)
  })

  it('console keys never collide with product keys', () => {
    const consoleKeys = new Set(
      consolePermissionCatalog.permissions.map((p) => p.key)
    )
    const productKeys = new Set([
      ...crmPermissionCatalog.permissions.map((p) => p.key),
      ...couriersPermissionCatalog.permissions.map((p) => p.key),
    ])
    for (const k of consoleKeys) {
      expect(productKeys.has(k)).toBe(false)
    }
  })
})

describe('resolveEffectivePermissions — adversarial', () => {
  it('returns [] for null role', () => {
    expect(
      resolveEffectivePermissions({
        role: null,
        catalog: consolePermissionCatalog,
      })
    ).toEqual([])
  })

  it('returns [] for undefined role', () => {
    expect(
      resolveEffectivePermissions({
        role: undefined,
        catalog: consolePermissionCatalog,
      })
    ).toEqual([])
  })

  it('deduplicates role permissions', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['users:read', 'users:read'] },
        catalog: consolePermissionCatalog,
      })
    ).toEqual(['users:read'])
  })

  it('sorts effective permissions', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['users:update', 'console:access'] },
        catalog: consolePermissionCatalog,
      })
    ).toEqual(['console:access', 'users:update'])
  })

  it('denies override grants', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['users:read'] },
        grants: ['users:read', 'console:access'],
        denies: ['users:read'],
        catalog: consolePermissionCatalog,
      })
    ).toEqual(['console:access'])
  })

  it('ignores non-string role permissions without throwing', () => {
    expect(
      resolveEffectivePermissions({
        role: {
          permissions: [
            123,
            null,
            undefined,
            'users:read',
          ] as unknown as string[],
        },
        catalog: consolePermissionCatalog,
      })
    ).toEqual(['users:read'])
  })

  it('ignores malformed catalog entries and keeps valid ones', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['users:read'] },
        catalog: [null, { key: 'users:read' }] as unknown as never,
      })
    ).toEqual(['users:read'])
  })

  it('never throws for malformed catalog', () => {
    expect(() =>
      resolveEffectivePermissions({
        role: { permissions: ['users:read'] },
        catalog: null as unknown as never,
      })
    ).not.toThrow()
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['users:read'] },
        catalog: null as unknown as never,
      })
    ).toEqual([])
  })

  it('defineAppPermissionCatalog duplicate detection works', () => {
    expect(() =>
      defineAppPermissionCatalog({
        app: '876-test',
        modules: [
          {
            key: 'mod',
            label: 'Mod',
            permissions: [{ action: 'view', label: 'View' }],
          },
          { key: 'mod', label: 'Mod2', permissions: [] },
        ],
      })
    ).toThrow()
  })
})
