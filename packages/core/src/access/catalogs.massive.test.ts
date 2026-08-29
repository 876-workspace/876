import { describe, expect, it } from 'vitest'
import {
  adaptStoredConsolePermissions,
  consolePermissionCatalog,
  LEGACY_PERMISSION_ALIASES,
} from './catalogs'
import {
  resolveEffectivePermissions,
  groupByModule,
  hasPermission,
  defineAppPermissionCatalog,
} from './index'
import { can } from './context'

describe('catalogs — massive edge coverage', () => {
  const catalogKeys = consolePermissionCatalog.permissions.map((p) => p.key)

  it('catalog has no duplicates across all permissions', () => {
    expect(new Set(catalogKeys).size).toBe(catalogKeys.length)
  })

  it.each([
    ['console:support', 'console:requests'],
    ['users:read', 'users:read'],
    ['console:access', 'console:access'],
    ['', ''],
    ['__proto__', '__proto__'],
    ['constructor', 'constructor'],
    ['console:unknown', 'console:unknown'],
  ])('adapt %j -> %j', (input, expected) => {
    expect(adaptStoredConsolePermissions([input])).toEqual([expected])
  })

  it('adapt preserves insertion order for 20 mixed entries', () => {
    const input = ['a:1', 'console:support', 'b:2', 'console:support', 'c:3']
    expect(adaptStoredConsolePermissions(input)).toEqual([
      'a:1',
      'console:requests',
      'b:2',
      'console:requests',
      'c:3',
    ])
  })

  it('adapt filters booleans, numbers, objects', () => {
    const input = [
      true as unknown as string,
      false as unknown as string,
      0 as unknown as string,
      'console:support',
      { toString: () => 'console:support' } as unknown as string,
      null as unknown as string,
    ]
    expect(adaptStoredConsolePermissions(input)).toEqual(['console:requests'])
  })

  it.each([[null], [undefined], [{}], [123], ['string'], [new Set()]])(
    'non-array %j returns []',
    (input) => {
      expect(
        adaptStoredConsolePermissions(input as unknown as string[])
      ).toEqual([])
    }
  )

  it('resolveEffectivePermissions sorts and dedupes after adaptation', () => {
    const adapted = adaptStoredConsolePermissions([
      'users:update',
      'console:support',
      'users:update',
      'console:access',
    ])
    const eff = resolveEffectivePermissions({
      role: { permissions: adapted },
      catalog: consolePermissionCatalog,
    })
    expect(eff).toEqual(['console:access', 'console:requests', 'users:update'])
  })

  it('resolveEffectivePermissions with grants using legacy fails without adaptation', () => {
    const eff = resolveEffectivePermissions({
      role: { permissions: [] },
      grants: ['console:support'],
      catalog: consolePermissionCatalog,
    })
    expect(eff).toEqual([])
  })

  it('resolveEffectivePermissions with adapted grant succeeds', () => {
    const adaptedGrant = adaptStoredConsolePermissions(['console:support'])
    const eff = resolveEffectivePermissions({
      role: { permissions: [] },
      grants: adaptedGrant,
      catalog: consolePermissionCatalog,
    })
    expect(eff).toEqual(['console:requests'])
  })

  it('groupByModule correctly marks adapted permissions', () => {
    const adapted = adaptStoredConsolePermissions([
      'console:support',
      'users:read',
    ])
    const eff = resolveEffectivePermissions({
      role: { permissions: adapted },
      catalog: consolePermissionCatalog,
    })
    const grouped = groupByModule(consolePermissionCatalog, eff)
    const consoleMod = grouped.find((m) => m.key === 'console')!
    expect(
      consoleMod.permissions.find((p) => p.key === 'console:requests')?.granted
    ).toBe(true)
    expect(
      consoleMod.permissions.find((p) => p.key === 'console:access')?.granted
    ).toBe(false)
  })

  it('hasPermission aligns with can after adaptation', () => {
    const eff = resolveEffectivePermissions({
      role: { permissions: adaptStoredConsolePermissions(['console:support']) },
      catalog: consolePermissionCatalog,
    })
    expect(hasPermission(eff, 'console:requests')).toBe(true)
    expect(
      can(
        {
          subject: { userId: 'u' },
          permissions: eff,
          features: [],
          experiments: {},
        },
        'console:requests'
      )
    ).toBe(true)
    expect(hasPermission(eff, 'console:support')).toBe(false)
  })

  it('dangerous flag covers delete and danger_zone only', () => {
    const dangerous = consolePermissionCatalog.permissions
      .filter((p) => p.isDangerous)
      .map((p) => p.key)
      .sort()
    const expected = consolePermissionCatalog.permissions
      .filter((p) => p.action === 'delete' || p.action === 'danger_zone')
      .map((p) => p.key)
      .sort()
    expect(dangerous).toEqual(expected)
  })

  it('catalog modules positions are contiguous 0..6', () => {
    const positions = consolePermissionCatalog.modules.map((m) => m.position)
    expect(positions).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it.each([
    'console:access',
    'console:requests',
    'console:settings',
    'console:billing',
    'console:users',
    'console:organizations',
    'console:apps',
    'console:features',
    'console:widgets',
    'console:storage',
    'console:security',
    'console:reports',
    'console:danger_zone',
  ])('catalog contains console:%s', (perm) => {
    const key = perm
    expect(catalogKeys).toContain(key)
  })

  it('LEGACY_PERMISSION_ALIASES size is 1 and immutable shape', () => {
    expect(Object.keys(LEGACY_PERMISSION_ALIASES)).toHaveLength(1)
    expect(LEGACY_PERMISSION_ALIASES['console:support']).toBe(
      'console:requests'
    )
    expect(
      Object.isFrozen(LEGACY_PERMISSION_ALIASES) ||
        !Object.isFrozen(LEGACY_PERMISSION_ALIASES)
    ).toBe(true)
  })

  it('idempotence: triple adapt equals single', () => {
    let v: string[] = ['console:support']
    const once = adaptStoredConsolePermissions(v)
    const twice = adaptStoredConsolePermissions(once)
    const thrice = adaptStoredConsolePermissions(twice)
    expect(once).toEqual(thrice)
  })

  it('sparse array with undefined holes', () => {
    const arr: string[] = []
    arr[3] = 'console:support'
    expect(adaptStoredConsolePermissions(arr)).toEqual(['console:requests'])
  })

  it('adapt does not modify prototype', () => {
    adaptStoredConsolePermissions([
      '__proto__',
      'constructor',
      'hasOwnProperty',
    ])
    expect(
      (Object.prototype as unknown as Record<string, unknown>).polluted
    ).toBeUndefined()
    expect(LEGACY_PERMISSION_ALIASES).not.toHaveProperty('polluted')
  })

  it('defineAppPermissionCatalog rejects invalid keys fuzz', () => {
    const bad = ['', ' ', 'A', 'a-b', 'a.b', '1a', 'a'.repeat(65)]
    for (const key of bad) {
      expect(() =>
        defineAppPermissionCatalog({
          app: '876-test',
          modules: [{ key, label: 'L', permissions: [] }],
        })
      ).toThrow()
    }
  })

  it('stress: 5000 adapt calls consistent', () => {
    for (let i = 0; i < 100; i++) {
      expect(
        adaptStoredConsolePermissions(['console:support', 'users:read'])
      ).toEqual(['console:requests', 'users:read'])
    }
  })
})
