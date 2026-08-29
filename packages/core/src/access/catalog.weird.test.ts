import { describe, expect, it } from 'vitest'
import {
  defineAppPermissionCatalog,
  resolveEffectivePermissions,
  groupByModule,
  hasPermission,
  type AppPermissionCatalog,
} from './index'

function cat(
  overrides: Partial<AppPermissionCatalog> = {}
): AppPermissionCatalog {
  return defineAppPermissionCatalog({
    app: '876-test',
    modules: [
      {
        key: 'm_one',
        label: 'M One',
        permissions: [
          { action: 'view', label: 'View m one' },
          { action: 'edit', label: 'Edit m one' },
        ],
      },
      {
        key: 'm_two',
        label: 'M Two',
        permissions: [{ action: 'view', label: 'View m two' }],
      },
    ],
  })
}

describe('defineAppPermissionCatalog — weird', () => {
  it('rejects app slug with uppercase', () => {
    expect(() =>
      defineAppPermissionCatalog({ app: '876-Test', modules: [] })
    ).toThrow(TypeError)
  })
  it('rejects app slug missing 876- prefix', () => {
    expect(() =>
      defineAppPermissionCatalog({ app: 'test-app', modules: [] })
    ).toThrow(TypeError)
  })
  it('accepts app slug with trailing hyphen (regex allows hyphens)', () => {
    expect(
      defineAppPermissionCatalog({ app: '876-test-', modules: [] }).app
    ).toBe('876-test-')
  })
  it('rejects app slug suffix longer than 64 chars', () => {
    expect(() =>
      defineAppPermissionCatalog({ app: `876-${'a'.repeat(65)}`, modules: [] })
    ).toThrow(TypeError)
  })
  it('accepts app slug exactly 64 char suffix boundary', () => {
    const slug = `876-${'a'.repeat(60)}`
    expect(defineAppPermissionCatalog({ app: slug, modules: [] }).app).toBe(
      slug
    )
  })
  it('rejects module key with dash', () => {
    expect(() =>
      defineAppPermissionCatalog({
        app: '876-test',
        modules: [{ key: 'my-module', label: 'M', permissions: [] }],
      })
    ).toThrow(TypeError)
  })
  it('rejects module key with dot', () => {
    expect(() =>
      defineAppPermissionCatalog({
        app: '876-test',
        modules: [{ key: 'my.module', label: 'M', permissions: [] }],
      })
    ).toThrow(TypeError)
  })
  it('rejects module key starting with digit', () => {
    expect(() =>
      defineAppPermissionCatalog({
        app: '876-test',
        modules: [{ key: '1module', label: 'M', permissions: [] }],
      })
    ).toThrow(TypeError)
  })
  it('rejects module key 65 chars', () => {
    expect(() =>
      defineAppPermissionCatalog({
        app: '876-test',
        modules: [{ key: 'a'.repeat(65), label: 'M', permissions: [] }],
      })
    ).toThrow(TypeError)
  })
  it('rejects module label empty after trim', () => {
    expect(() =>
      defineAppPermissionCatalog({
        app: '876-test',
        modules: [{ key: 'mod', label: '   ', permissions: [] }],
      })
    ).toThrow(TypeError)
  })
  it('rejects module label 121 chars', () => {
    expect(() =>
      defineAppPermissionCatalog({
        app: '876-test',
        modules: [{ key: 'mod', label: 'a'.repeat(121), permissions: [] }],
      })
    ).toThrow(TypeError)
  })
  it('rejects module label with null char', () => {
    expect(() =>
      defineAppPermissionCatalog({
        app: '876-test',
        modules: [{ key: 'mod', label: 'hello\u0000world', permissions: [] }],
      })
    ).toThrow(TypeError)
  })
  it('trims module label', () => {
    const c = defineAppPermissionCatalog({
      app: '876-test',
      modules: [
        {
          key: 'mod',
          label: '  My Module  ',
          permissions: [{ action: 'view', label: '  View  ' }],
        },
      ],
    })
    expect(c.modules[0]?.label).toBe('My Module')
    expect(c.modules[0]?.permissions[0]?.label).toBe('View')
  })
  it('rejects permission action with uppercase', () => {
    expect(() =>
      defineAppPermissionCatalog({
        app: '876-test',
        modules: [
          {
            key: 'mod',
            label: 'M',
            permissions: [{ action: 'View', label: 'View' }],
          },
        ],
      })
    ).toThrow(TypeError)
  })
  it('rejects permission action with dash', () => {
    expect(() =>
      defineAppPermissionCatalog({
        app: '876-test',
        modules: [
          {
            key: 'mod',
            label: 'M',
            permissions: [{ action: 'my-action', label: 'M' }],
          },
        ],
      })
    ).toThrow(TypeError)
  })
  it('rejects duplicate module keys', () => {
    expect(() =>
      defineAppPermissionCatalog({
        app: '876-test',
        modules: [
          { key: 'a', label: 'A', permissions: [] },
          { key: 'a', label: 'A2', permissions: [] },
        ],
      })
    ).toThrow('Duplicate app permission module')
  })
  it('rejects duplicate permission key in same module', () => {
    expect(() =>
      defineAppPermissionCatalog({
        app: '876-test',
        modules: [
          {
            key: 'mod',
            label: 'M',
            permissions: [
              { action: 'view', label: 'V1' },
              { action: 'view', label: 'V2' },
            ],
          },
        ],
      })
    ).toThrow('Duplicate app permission')
  })
  it('handles description trim and null fallback', () => {
    const c = defineAppPermissionCatalog({
      app: '876-test',
      modules: [
        {
          key: 'mod',
          label: 'M',
          permissions: [
            { action: 'view', label: 'V', description: '  desc  ' },
            { action: 'edit', label: 'E' },
          ],
        },
      ],
    })
    expect(c.permissions.find((p) => p.key === 'mod.view')?.description).toBe(
      'desc'
    )
    expect(
      c.permissions.find((p) => p.key === 'mod.edit')?.description
    ).toBeNull()
  })
  it('handles isDangerous undefined defaults false', () => {
    const c = defineAppPermissionCatalog({
      app: '876-test',
      modules: [
        {
          key: 'mod',
          label: 'M',
          permissions: [{ action: 'view', label: 'V' }],
        },
      ],
    })
    expect(c.permissions[0]?.isDangerous).toBe(false)
  })
  it('sorts by position then lexicographically', () => {
    const c = defineAppPermissionCatalog({
      app: '876-test',
      modules: [
        {
          key: 'b_mod',
          label: 'B',
          position: 2,
          permissions: [
            { action: 'view', label: 'V', position: 2 },
            { action: 'edit', label: 'E', position: 1 },
          ],
        },
        {
          key: 'a_mod',
          label: 'A',
          position: 1,
          permissions: [{ action: 'view', label: 'V' }],
        },
      ],
    })
    expect(c.modules.map((m) => m.key)).toEqual(['a_mod', 'b_mod'])
    expect(
      c.modules.find((m) => m.key === 'b_mod')?.permissions.map((p) => p.action)
    ).toEqual(['edit', 'view'])
    expect(c.permissions.map((p) => p.key)).toEqual([
      'a_mod.view',
      'b_mod.edit',
      'b_mod.view',
    ])
  })
  it('handles position as NaN -> treated as NaN sorting (still not throw)', () => {
    const c = defineAppPermissionCatalog({
      app: '876-test',
      modules: [
        {
          key: 'mod',
          label: 'M',
          permissions: [{ action: 'view', label: 'V', position: NaN as any }],
        },
      ],
    })
    expect(c.permissions.length).toBe(1)
  })
  it('handles modules empty -> empty catalog', () => {
    const c = defineAppPermissionCatalog({ app: '876-test', modules: [] })
    expect(c.permissions).toEqual([])
    expect(c.modules).toEqual([])
  })
  it('rejects __proto__ module key (fails regex)', () => {
    expect(() =>
      defineAppPermissionCatalog({
        app: '876-test',
        modules: [{ key: '__proto__', label: 'M', permissions: [] }],
      })
    ).toThrow(TypeError)
  })
  it('rejects app slug with emoji', () => {
    expect(() =>
      defineAppPermissionCatalog({ app: '876-😀', modules: [] })
    ).toThrow(TypeError)
  })
  it('does not allow prototype pollution via modules array prototype', () => {
    const evil = Object.create(Array.prototype) as any
    evil.push({
      key: 'mod',
      label: 'M',
      permissions: [{ action: 'view', label: 'V' }],
    })
    const c = defineAppPermissionCatalog({ app: '876-test', modules: evil })
    expect(c.permissions[0]?.key).toBe('mod.view')
  })
})

describe('resolveEffectivePermissions — weird', () => {
  const catalog = cat()

  it('returns [] when catalog is null', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['m_one.view'] },
        catalog: null as unknown as AppPermissionCatalog,
      })
    ).toEqual([])
  })
  it('returns [] when catalog is undefined', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['m_one.view'] },
        catalog: undefined as unknown as AppPermissionCatalog,
      })
    ).toEqual([])
  })
  it('returns [] when catalog is string', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['m_one.view'] },
        catalog: 'evil' as unknown as AppPermissionCatalog,
      })
    ).toEqual([])
  })
  it('returns [] when role is string', () => {
    expect(
      resolveEffectivePermissions({ role: 'evil' as unknown as any, catalog })
    ).toEqual([])
  })
  it('handles role permissions not an array', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: 'm_one.view' as unknown as string[] },
        catalog,
      })
    ).toEqual([])
  })
  it('ignores non-string entries in role permissions', () => {
    expect(
      resolveEffectivePermissions({
        role: {
          permissions: [
            'm_one.view',
            42 as unknown as string,
            null as unknown as string,
          ],
        },
        catalog,
      })
    ).toEqual(['m_one.view'])
  })
  it('ignores non-string grants', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['m_one.view'] },
        grants: [42 as unknown as string, 'm_two.view'],
        catalog,
      })
    ).toEqual(['m_one.view', 'm_two.view'])
  })
  it('ignores non-string denies', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['m_one.view', 'm_two.view'] },
        denies: [null as unknown as string, 'm_two.view'],
        catalog,
      })
    ).toEqual(['m_one.view'])
  })
  it('filters out permissions not in catalog', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['m_one.view', 'not:in_catalog'] },
        catalog,
      })
    ).toEqual(['m_one.view'])
  })
  it('grants not in catalog are dropped', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: [] },
        grants: ['evil:perm'],
        catalog,
      })
    ).toEqual([])
  })
  it('denies that are not held are no-ops', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['m_one.view'] },
        denies: ['m_two.view'],
        catalog,
      })
    ).toEqual(['m_one.view'])
  })
  it('grants and denies interaction — deny wins over grant', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: [] },
        grants: ['m_one.view'],
        denies: ['m_one.view'],
        catalog,
      })
    ).toEqual([])
  })
  it('grant adds, deny removes, sorted output', () => {
    const res = resolveEffectivePermissions({
      role: { permissions: ['m_two.view'] },
      grants: ['m_one.edit'],
      denies: ['m_two.view'],
      catalog,
    })
    expect(res).toEqual(['m_one.edit'])
  })
  it('handles duplicate grants and denies', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['m_one.view'] },
        grants: ['m_one.edit', 'm_one.edit'],
        denies: ['m_one.view', 'm_one.view'],
        catalog,
      })
    ).toEqual(['m_one.edit'])
  })
  it('handles catalog as array of permissions', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['m_one.view'] },
        catalog: catalog.permissions,
      })
    ).toEqual(['m_one.view'])
  })
  it('handles catalog array with null entries filtered', () => {
    const weird = [
      ...catalog.permissions,
      null as unknown as any,
      { key: 123 } as unknown as any,
    ]
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['m_one.view'] },
        catalog: weird as unknown as AppPermissionCatalog,
      })
    ).toEqual(['m_one.view'])
  })
  it('handles role with __proto__ permission (allowed if in catalog? not, so dropped)', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['__proto__'] },
        catalog,
      })
    ).toEqual([])
  })
  it('handles extremely large permission set (1000 perms) filtering', () => {
    const many = Array.from({ length: 1000 }, (_, i) => `m_one.view${i}`)
    const res = resolveEffectivePermissions({
      role: { permissions: many },
      catalog,
    })
    expect(res).toEqual([])
  })
  it('returns [] when input getter throws', () => {
    const evil = {
      get role() {
        throw new Error('boom')
      },
      catalog,
    } as unknown as any
    expect(resolveEffectivePermissions(evil)).toEqual([])
  })
  it('handles grants as array-like object (not array) -> ignored', () => {
    const fake = { 0: 'm_one.edit', length: 1 } as unknown as string[]
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['m_one.view'] },
        grants: fake,
        catalog,
      })
    ).toEqual(['m_one.view'])
  })
  it('handles Object.create(null) role permissions', () => {
    const role = Object.create(null) as any
    role.permissions = ['m_one.view']
    expect(resolveEffectivePermissions({ role, catalog })).toEqual([
      'm_one.view',
    ])
  })
  it('handles frozen role and catalog', () => {
    const role = Object.freeze({ permissions: ['m_one.view'] })
    const fr = Object.freeze(catalog)
    expect(resolveEffectivePermissions({ role, catalog: fr })).toEqual([
      'm_one.view',
    ])
  })
  it('does not mutate input arrays', () => {
    const rolePerms = ['m_one.view']
    const grants = ['m_one.edit']
    const denies = ['m_one.view']
    resolveEffectivePermissions({
      role: { permissions: rolePerms },
      grants,
      denies,
      catalog,
    })
    expect(rolePerms).toEqual(['m_one.view'])
    expect(grants).toEqual(['m_one.edit'])
    expect(denies).toEqual(['m_one.view'])
  })
  it('output is sorted lexicographically', () => {
    const res = resolveEffectivePermissions({
      role: { permissions: ['m_two.view', 'm_one.view', 'm_one.edit'] },
      catalog,
    })
    expect(res).toEqual(['m_one.edit', 'm_one.view', 'm_two.view'])
  })
})

describe('hasPermission — weird', () => {
  it('returns false when effective is null', () => {
    expect(hasPermission(null, 'm_one.view')).toBe(false)
  })
  it('returns false when effective is undefined', () => {
    expect(hasPermission(undefined, 'm_one.view')).toBe(false)
  })
  it('returns false when effective is string', () => {
    expect(
      hasPermission('m_one.view' as unknown as string[], 'm_one.view')
    ).toBe(false)
  })
  it('returns false when effective is object', () => {
    expect(
      hasPermission({ 0: 'm_one.view' } as unknown as string[], 'm_one.view')
    ).toBe(false)
  })
  it('returns false for empty permission string', () => {
    expect(hasPermission(['m_one.view'], '')).toBe(false)
  })
  it('returns true for exact match', () => {
    expect(hasPermission(['m_one.view'], 'm_one.view')).toBe(true)
  })
  it('is case-sensitive', () => {
    expect(hasPermission(['m_one.view'], 'M_ONE.VIEW')).toBe(false)
  })
  it('does not match prefix', () => {
    expect(hasPermission(['m_one.view_extra'], 'm_one.view')).toBe(false)
  })
  it('handles sparse effective array', () => {
    const sparse = Array(2) as unknown as string[]
    sparse[1] = 'm_one.view'
    expect(hasPermission(sparse, 'm_one.view')).toBe(true)
  })
  it('handles Uint8Array effective (not array)', () => {
    expect(
      hasPermission(new Uint8Array([1]) as unknown as string[], 'm_one.view')
    ).toBe(false)
  })
})

describe('groupByModule — weird', () => {
  const catalog = cat()

  it('marks granted correctly', () => {
    const res = groupByModule(catalog, ['m_one.view'])
    expect(
      res
        .find((m) => m.key === 'm_one')
        ?.permissions.find((p) => p.key === 'm_one.view')?.granted
    ).toBe(true)
    expect(
      res
        .find((m) => m.key === 'm_one')
        ?.permissions.find((p) => p.key === 'm_one.edit')?.granted
    ).toBe(false)
  })
  it('handles effective null', () => {
    const res = groupByModule(catalog, null)
    expect(
      res.every((m) => m.permissions.every((p) => p.granted === false))
    ).toBe(true)
  })
  it('handles effective undefined', () => {
    const res = groupByModule(catalog, undefined)
    expect(
      res.every((m) => m.permissions.every((p) => p.granted === false))
    ).toBe(true)
  })
  it('handles effective with non-strings filtered', () => {
    const res = groupByModule(catalog, ['m_one.view', 42 as unknown as string])
    expect(
      res
        .find((m) => m.key === 'm_one')
        ?.permissions.find((p) => p.key === 'm_one.view')?.granted
    ).toBe(true)
  })
  it('returns modules in catalog order (not sorted by effective)', () => {
    const res = groupByModule(catalog, ['m_two.view', 'm_one.edit'])
    expect(res.map((m) => m.key)).toEqual(['m_one', 'm_two'])
  })
  it('does not mutate catalog', () => {
    const before = JSON.stringify(catalog)
    groupByModule(catalog, ['m_one.view'])
    expect(JSON.stringify(catalog)).toBe(before)
  })
  it('handles catalog with no modules', () => {
    const empty = defineAppPermissionCatalog({ app: '876-test', modules: [] })
    expect(groupByModule(empty, ['x'])).toEqual([])
  })
  it('handles effective as array-like object (ignored)', () => {
    const fake = { 0: 'm_one.view', length: 1 } as unknown as string[]
    const res = groupByModule(catalog, fake)
    expect(
      res.every((m) => m.permissions.every((p) => p.granted === false))
    ).toBe(true)
  })
  it('handles __proto__ granted key (not in catalog so false everywhere)', () => {
    const res = groupByModule(catalog, ['__proto__'])
    expect(
      res.every((m) => m.permissions.every((p) => p.granted === false))
    ).toBe(true)
  })
})
