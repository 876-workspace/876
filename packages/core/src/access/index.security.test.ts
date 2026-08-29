import { describe, expect, it } from 'vitest'

import { consolePermissionCatalog } from './catalogs'
import {
  defineAppPermissionCatalog,
  resolveEffectivePermissions,
  groupByModule,
  hasPermission,
} from './index'

describe('defineAppPermissionCatalog — security boundary', () => {
  it('rejects app slug without 876- prefix', () => {
    expect(() =>
      defineAppPermissionCatalog({ app: 'crm', modules: [] })
    ).toThrow(TypeError)
  })

  it('rejects uppercase app slug', () => {
    expect(() =>
      defineAppPermissionCatalog({ app: '876-CRM', modules: [] })
    ).toThrow(TypeError)
  })

  it('rejects module key with dash', () => {
    expect(() =>
      defineAppPermissionCatalog({
        app: '876-test',
        modules: [{ key: 'bad-key', label: 'Bad', permissions: [] }],
      })
    ).toThrow(TypeError)
  })

  it('rejects module key starting with number', () => {
    expect(() =>
      defineAppPermissionCatalog({
        app: '876-test',
        modules: [{ key: '1bad', label: 'Bad', permissions: [] }],
      })
    ).toThrow(TypeError)
  })

  it('rejects duplicate module keys', () => {
    expect(() =>
      defineAppPermissionCatalog({
        app: '876-test',
        modules: [
          { key: 'mod', label: 'One', permissions: [] },
          { key: 'mod', label: 'Two', permissions: [] },
        ],
      })
    ).toThrow(/Duplicate app permission module/)
  })

  it('rejects duplicate permission action within module', () => {
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
    ).toThrow(/Duplicate app permission/)
  })

  it('rejects overlong module key (65 chars)', () => {
    expect(() =>
      defineAppPermissionCatalog({
        app: '876-test',
        modules: [{ key: 'a'.repeat(65), label: 'Long', permissions: [] }],
      })
    ).toThrow(TypeError)
  })

  it('rejects empty label', () => {
    expect(() =>
      defineAppPermissionCatalog({
        app: '876-test',
        modules: [{ key: 'mod', label: '   ', permissions: [] }],
      })
    ).toThrow(TypeError)
  })

  it('trims labels', () => {
    const cat = defineAppPermissionCatalog({
      app: '876-test',
      modules: [
        {
          key: 'mod',
          label: '  My Mod  ',
          permissions: [{ action: 'view', label: '  View  ' }],
        },
      ],
    })
    expect(cat.modules[0]?.label).toBe('My Mod')
    expect(cat.modules[0]?.permissions[0]?.label).toBe('View')
  })

  it('sorts modules by position then key', () => {
    const cat = defineAppPermissionCatalog({
      app: '876-test',
      modules: [
        { key: 'b', label: 'B', permissions: [] },
        { key: 'a', label: 'A', permissions: [] },
      ],
    })
    expect(cat.modules.map((m) => m.key)).toEqual(['a', 'b'])
  })

  it('retains console catalog positions', () => {
    expect(consolePermissionCatalog.modules.map((m) => m.position)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ])
  })
})

describe('resolveEffectivePermissions — boundary invariants', () => {
  it('empty role and empty catalog gives empty', () => {
    expect(resolveEffectivePermissions({ role: null, catalog: [] })).toEqual([])
  })

  it('null catalog handled without throw', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['console:access'] },
        catalog: null as unknown as never,
      })
    ).toEqual([])
  })

  it('filters to live catalog — no privilege escalation via stale grants', () => {
    const effective = resolveEffectivePermissions({
      role: { permissions: ['console:access', 'evil:admin'] },
      grants: ['evil:super'],
      catalog: consolePermissionCatalog,
    })
    expect(effective).toEqual(['console:access'])
  })

  it('denies can revoke grants', () => {
    expect(
      resolveEffectivePermissions({
        role: { permissions: ['console:access'] },
        grants: ['users:read'],
        denies: ['users:read'],
        catalog: consolePermissionCatalog,
      })
    ).toEqual(['console:access'])
  })

  it('ordering is sorted, not insertion order', () => {
    const effective = resolveEffectivePermissions({
      role: {
        permissions: ['users:read', 'console:access', 'console:requests'],
      },
      catalog: consolePermissionCatalog,
    })
    expect(effective).toEqual([
      'console:access',
      'console:requests',
      'users:read',
    ])
  })

  it('hasPermission is strict equality', () => {
    const eff = ['console:access']
    expect(hasPermission(eff, 'console:access')).toBe(true)
    expect(hasPermission(eff, 'console:access ')).toBe(false)
    expect(hasPermission(eff, 'Console:Access')).toBe(false)
    expect(hasPermission(null, 'console:access')).toBe(false)
    expect(hasPermission(undefined, '')).toBe(false)
  })

  it('groupByModule marks only effective as granted', () => {
    const grouped = groupByModule(consolePermissionCatalog, ['console:access'])
    const consoleMod = grouped.find((m) => m.key === 'console')!
    expect(
      consoleMod.permissions.find((p) => p.key === 'console:access')?.granted
    ).toBe(true)
    expect(
      consoleMod.permissions.find((p) => p.key === 'console:requests')?.granted
    ).toBe(false)
    const teamMod = grouped.find((m) => m.key === 'team')!
    for (const p of teamMod.permissions) expect(p.granted).toBe(false)
  })

  it('groupByModule with null grants nothing', () => {
    const grouped = groupByModule(consolePermissionCatalog, null)
    for (const mod of grouped)
      for (const p of mod.permissions) expect(p.granted).toBe(false)
  })
})

describe('cross-cutting: stored keys + effective + grouping', () => {
  it('full pipeline: stored keys -> effective -> group -> hasPermission', async () => {
    const { toStoredPermissionKeys } = await import('./catalogs')
    const adapted = toStoredPermissionKeys([
      'console:support',
      'users:read',
      'legacy:root',
    ])
    const effective = resolveEffectivePermissions({
      role: { permissions: adapted },
      catalog: consolePermissionCatalog,
    })
    // Neither the retired console:support key nor the unknown legacy:root key
    // survives the catalog intersection.
    expect(effective).toEqual(['users:read'])
    expect(hasPermission(effective, 'console:requests')).toBe(false)
    expect(hasPermission(effective, 'console:support')).toBe(false)
    const grouped = groupByModule(consolePermissionCatalog, effective)
    expect(
      grouped
        .find((m) => m.key === 'console')
        ?.permissions.find((p) => p.key === 'console:requests')?.granted
    ).toBe(false)
  })

  it('canonical pipeline without adaptation', () => {
    const effective = resolveEffectivePermissions({
      role: { permissions: ['console:requests', 'console:access'] },
      catalog: consolePermissionCatalog,
    })
    expect(effective).toEqual(['console:access', 'console:requests'])
  })
})
