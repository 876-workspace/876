import { describe, expect, it } from 'vitest'

import {
  defineAppPermissionCatalog,
  groupByModule,
  hasPermission,
  resolveEffectivePermissions,
  type AppPermissionCatalog,
} from './index'

const SECURITY_INPUTS = [
  '<script>alert(1)</script>',
  "' OR '1'='1",
  '../../etc/passwd',
  '__proto__',
  '\u0000',
  '\u202e',
  'a'.repeat(10_000),
] as const

function crmCatalog(): AppPermissionCatalog {
  return defineAppPermissionCatalog({
    app: '876-crm',
    modules: [
      {
        key: 'requests',
        label: 'Requests',
        position: 1,
        permissions: [
          { action: 'view', label: 'View requests', position: 1 },
          { action: 'edit', label: 'Edit requests', position: 2 },
          { action: 'delete', label: 'Delete requests', isDangerous: true, position: 3 },
        ],
      },
      {
        key: 'customers',
        label: 'Customers',
        position: 2,
        permissions: [
          { action: 'view', label: 'View customers' },
          { action: 'edit', label: 'Edit customers' },
        ],
      },
    ],
  })
}

describe('defineAppPermissionCatalog', () => {
  it('returns stable keys derived from module and action', () => {
    const result = crmCatalog()

    expect(result.permissions.map((permission) => permission.key)).toEqual([
      'customers.edit',
      'customers.view',
      'requests.delete',
      'requests.edit',
      'requests.view',
    ])
  })

  it('sorts modules and permissions by position without mutating keys', () => {
    const result = crmCatalog()

    expect(result.modules.map((module) => module.key)).toEqual(['requests', 'customers'])
    expect(result.modules[0]?.permissions.map((permission) => permission.key)).toEqual([
      'requests.view',
      'requests.edit',
      'requests.delete',
    ])
  })

  it('rejects duplicate module keys', () => {
    const act = () =>
      defineAppPermissionCatalog({
        app: '876-crm',
        modules: [
          { key: 'requests', label: 'Requests', permissions: [] },
          { key: 'requests', label: 'Requests again', permissions: [] },
        ],
      })

    expect(act).toThrow('Duplicate app permission module: requests.')
  })

  it('rejects duplicate permission keys inside a module', () => {
    const act = () =>
      defineAppPermissionCatalog({
        app: '876-crm',
        modules: [
          {
            key: 'requests',
            label: 'Requests',
            permissions: [
              { action: 'view', label: 'View requests' },
              { action: 'view', label: 'Read requests' },
            ],
          },
        ],
      })

    expect(act).toThrow('Duplicate app permission: requests.view.')
  })

  it.each(SECURITY_INPUTS)('rejects unsafe module key %j', (value) => {
    const act = () =>
      defineAppPermissionCatalog({
        app: '876-crm',
        modules: [{ key: value, label: 'Requests', permissions: [] }],
      })

    expect(act).toThrow(TypeError)
  })

  it.each(SECURITY_INPUTS)('rejects unsafe permission action %j', (value) => {
    const act = () =>
      defineAppPermissionCatalog({
        app: '876-crm',
        modules: [
          {
            key: 'requests',
            label: 'Requests',
            permissions: [{ action: value, label: 'View requests' }],
          },
        ],
      })

    expect(act).toThrow(TypeError)
  })

  it('rejects a non-platform app slug', () => {
    const act = () => defineAppPermissionCatalog({ app: 'crm', modules: [] })

    expect(act).toThrow('App must be a stable 876 app slug.')
  })

  it('rejects an empty module label', () => {
    const act = () =>
      defineAppPermissionCatalog({
        app: '876-crm',
        modules: [{ key: 'requests', label: '   ', permissions: [] }],
      })

    expect(act).toThrow('Module label must be a safe non-empty label.')
  })
})

describe('resolveEffectivePermissions', () => {
  it('returns only live role permissions from the catalog', () => {
    const result = resolveEffectivePermissions({
      role: { permissions: ['requests.view', 'requests.edit'] },
      catalog: crmCatalog(),
    })

    expect(result).toEqual(['requests.edit', 'requests.view'])
  })

  it('fails closed when the role is missing', () => {
    const result = resolveEffectivePermissions({ role: null, catalog: crmCatalog() })

    expect(result).toEqual([])
  })

  it('adds an explicit permission grant', () => {
    const result = resolveEffectivePermissions({
      role: { permissions: ['requests.view'] },
      grants: ['requests.edit'],
      catalog: crmCatalog(),
    })

    expect(result).toEqual(['requests.edit', 'requests.view'])
  })

  it('removes an explicit permission denial', () => {
    const result = resolveEffectivePermissions({
      role: { permissions: ['requests.view', 'requests.edit'] },
      denies: ['requests.edit'],
      catalog: crmCatalog(),
    })

    expect(result).toEqual(['requests.view'])
  })

  it('lets a denial beat the same explicit grant', () => {
    const result = resolveEffectivePermissions({
      role: { permissions: ['requests.view'] },
      grants: ['requests.edit'],
      denies: ['requests.edit'],
      catalog: crmCatalog(),
    })

    expect(result).toEqual(['requests.view'])
  })

  it('silently removes stale permissions that are absent from the catalog', () => {
    const result = resolveEffectivePermissions({
      role: { permissions: ['requests.view', 'legacy.super_admin'] },
      grants: ['legacy.override'],
      catalog: crmCatalog(),
    })

    expect(result).toEqual(['requests.view'])
  })

  it('deduplicates and sorts effective permissions', () => {
    const result = resolveEffectivePermissions({
      role: { permissions: ['requests.view', 'customers.view', 'requests.view'] },
      grants: ['customers.view', 'requests.edit'],
      catalog: crmCatalog(),
    })

    expect(result).toEqual(['customers.view', 'requests.edit', 'requests.view'])
  })

  it('degrades a malformed role permission value to no base permissions', () => {
    const result = resolveEffectivePermissions({
      role: { permissions: 'requests.view' } as unknown as { permissions: string[] },
      catalog: crmCatalog(),
    })

    expect(result).toEqual([])
  })

  it('ignores non-string values in malformed grants', () => {
    const result = resolveEffectivePermissions({
      role: { permissions: ['requests.view'] },
      grants: ['requests.edit', 42, null] as unknown as string[],
      catalog: crmCatalog(),
    })

    expect(result).toEqual(['requests.edit', 'requests.view'])
  })

  it('ignores non-string values in malformed denies', () => {
    const result = resolveEffectivePermissions({
      role: { permissions: ['requests.view', 'requests.edit'] },
      denies: [false, 'requests.edit'] as unknown as string[],
      catalog: crmCatalog(),
    })

    expect(result).toEqual(['requests.view'])
  })

  it('returns an empty set for a malformed catalog without throwing', () => {
    const result = resolveEffectivePermissions({
      role: { permissions: ['requests.view'] },
      catalog: null as unknown as AppPermissionCatalog,
    })

    expect(result).toEqual([])
  })

  it('returns the same result on repeated calls with the same input', () => {
    const input = {
      role: { permissions: ['requests.view'] },
      grants: ['requests.edit'],
      denies: ['customers.edit'],
      catalog: crmCatalog(),
    }

    const first = resolveEffectivePermissions(input)
    const second = resolveEffectivePermissions(input)

    expect(first).toEqual(['requests.edit', 'requests.view'])
    expect(second).toEqual(first)
  })
})

describe('hasPermission', () => {
  it('returns true when the effective set contains the permission', () => {
    const result = hasPermission(['requests.view', 'requests.edit'], 'requests.edit')

    expect(result).toBe(true)
  })

  it('returns false when the effective set omits the permission', () => {
    const result = hasPermission(['requests.view'], 'requests.edit')

    expect(result).toBe(false)
  })

  it('returns false for a missing effective set', () => {
    const result = hasPermission(null, 'requests.view')

    expect(result).toBe(false)
  })
})

describe('groupByModule', () => {
  it('returns every catalog permission with explicit granted state', () => {
    const result = groupByModule(crmCatalog(), ['requests.edit', 'customers.view'])

    expect(result).toEqual([
      {
        key: 'requests',
        label: 'Requests',
        position: 1,
        permissions: [
          {
            key: 'requests.view',
            moduleKey: 'requests',
            action: 'view',
            label: 'View requests',
            description: null,
            isDangerous: false,
            position: 1,
            granted: false,
          },
          {
            key: 'requests.edit',
            moduleKey: 'requests',
            action: 'edit',
            label: 'Edit requests',
            description: null,
            isDangerous: false,
            position: 2,
            granted: true,
          },
          {
            key: 'requests.delete',
            moduleKey: 'requests',
            action: 'delete',
            label: 'Delete requests',
            description: null,
            isDangerous: true,
            position: 3,
            granted: false,
          },
        ],
      },
      {
        key: 'customers',
        label: 'Customers',
        position: 2,
        permissions: [
          {
            key: 'customers.edit',
            moduleKey: 'customers',
            action: 'edit',
            label: 'Edit customers',
            description: null,
            isDangerous: false,
            position: 0,
            granted: false,
          },
          {
            key: 'customers.view',
            moduleKey: 'customers',
            action: 'view',
            label: 'View customers',
            description: null,
            isDangerous: false,
            position: 0,
            granted: true,
          },
        ],
      },
    ])
  })

  it('marks every permission false when effective permissions are missing', () => {
    const result = groupByModule(crmCatalog(), undefined)

    expect(result.flatMap((module) => module.permissions.map((permission) => permission.granted))).toEqual([
      false,
      false,
      false,
      false,
      false,
    ])
  })
})
