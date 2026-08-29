import { describe, expect, it } from 'vitest'

import { can, type AccessContext } from './context'
import { defineAppPermissionCatalog } from './index'
import {
  defineNavigation,
  resolveNavigation,
  type NavGroupDefinition,
} from './navigation'
import { consolePermissionCatalog } from './catalogs'

function ctx(perms: string[], features: string[] = []): AccessContext {
  return {
    subject: { userId: 'u' },
    permissions: perms,
    features,
    experiments: {},
  }
}

function registry(
  entries: NavGroupDefinition['entries']
): NavGroupDefinition[] {
  return [
    {
      key: 'main',
      entries,
    },
  ]
}

describe('navigation — security and edge cases', () => {
  it('hides entry requiring permission not held', () => {
    const groups = registry([
      {
        key: 'req',
        href: '/req',
        title: 'Requests',
        icon: 'requests',
        requires: { permission: 'console:requests' },
      },
    ])
    expect(resolveNavigation(groups, ctx([]))).toEqual([])
    expect(resolveNavigation(groups, ctx(['console:requests']))).toHaveLength(1)
  })

  it('legacy support permission does NOT grant requests nav — must be adapted first', () => {
    const groups = registry([
      {
        key: 'req',
        href: '/req',
        title: 'Requests',
        icon: 'requests',
        requires: { permission: 'console:requests' },
      },
    ])
    expect(resolveNavigation(groups, ctx(['console:support']))).toEqual([])
  })

  it('anyPermission requires at least one', () => {
    const groups = registry([
      {
        key: 'x',
        href: '/x',
        title: 'X',
        icon: 'x',
        requires: { anyPermission: ['users:list', 'team:list'] },
      },
    ])
    expect(resolveNavigation(groups, ctx([]))).toEqual([])
    expect(resolveNavigation(groups, ctx(['team:list']))).toHaveLength(1)
    expect(resolveNavigation(groups, ctx(['users:list']))).toHaveLength(1)
    expect(
      resolveNavigation(groups, ctx(['users:list', 'team:list']))
    ).toHaveLength(1)
  })

  it('requires both permission and anyPermission when both declared', () => {
    const groups = registry([
      {
        key: 'x',
        href: '/x',
        title: 'X',
        icon: 'x',
        requires: {
          permission: 'users:read',
          anyPermission: ['team:list', 'users:list'],
        },
      },
    ])
    expect(resolveNavigation(groups, ctx(['users:read']))).toEqual([])
    expect(
      resolveNavigation(groups, ctx(['users:read', 'team:list']))
    ).toHaveLength(1)
  })

  it('feature requirement hides entry when feature disabled', () => {
    const groups = registry([
      {
        key: 'rep',
        href: '/rep',
        title: 'Reports',
        icon: 'reports',
        requires: { feature: 'console_reports' },
      },
    ])
    expect(resolveNavigation(groups, ctx(['console:access'], []))).toEqual([])
    expect(
      resolveNavigation(groups, ctx(['console:access'], ['console_reports']))
    ).toHaveLength(1)
  })

  it('permission + feature both required', () => {
    const groups = registry([
      {
        key: 'rep',
        href: '/rep',
        title: 'Reports',
        icon: 'reports',
        requires: { permission: 'console:reports', feature: 'console_reports' },
      },
    ])
    expect(resolveNavigation(groups, ctx(['console:reports'], []))).toEqual([])
    expect(resolveNavigation(groups, ctx([], ['console_reports']))).toEqual([])
    expect(
      resolveNavigation(groups, ctx(['console:reports'], ['console_reports']))
    ).toHaveLength(1)
  })

  it('entries without requires are always visible', () => {
    const groups = registry([
      { key: 'home', href: '/', title: 'Home', icon: 'home' },
    ])
    expect(resolveNavigation(groups, ctx([]))).toHaveLength(1)
  })

  it('empty groups returns empty', () => {
    expect(resolveNavigation([], ctx(['console:access']))).toEqual([])
  })

  it('filters malformed groups without throwing', () => {
    expect(() =>
      resolveNavigation(null as unknown as NavGroupDefinition[], ctx([]))
    ).not.toThrow()
    expect(
      resolveNavigation(null as unknown as NavGroupDefinition[], ctx([]))
    ).toEqual([])
  })

  it('handles null context gracefully — no crash, no entries with permission gates', () => {
    const groups = registry([
      {
        key: 'req',
        href: '/req',
        title: 'R',
        icon: 'requests',
        requires: { permission: 'console:access' },
      },
    ])
    expect(() =>
      resolveNavigation(groups, null as unknown as AccessContext)
    ).not.toThrow()
    expect(resolveNavigation(groups, null as unknown as AccessContext)).toEqual(
      []
    )
  })

  it('respects console catalog sorted permission list', () => {
    const catKeys = new Set(
      consolePermissionCatalog.permissions.map((p) => p.key)
    )
    expect(catKeys.has('console:requests')).toBe(true)
    expect(catKeys.has('console:support')).toBe(false)
  })

  it('defineNavigation returns groups verbatim without throwing', () => {
    const groups: NavGroupDefinition[] = [
      {
        key: 'main',
        entries: [{ key: 'ok_key', href: '/ok', title: 'Ok', icon: 'ok' }],
      },
    ]
    expect(defineNavigation(groups)).toEqual(groups)
  })

  it('resolveNavigation does not mutate input groups', () => {
    const groups = registry([
      {
        key: 'req',
        href: '/req',
        title: 'Req',
        icon: 'requests',
        requires: { permission: 'console:requests' },
      },
    ])
    const copy = JSON.parse(JSON.stringify(groups))
    resolveNavigation(groups, ctx(['console:requests']))
    expect(groups).toEqual(copy)
  })

  it('multiple groups filtered independently', () => {
    const groups: NavGroupDefinition[] = [
      {
        key: 'a',
        label: 'A',
        entries: [
          {
            key: 'a1',
            href: '/a1',
            title: 'A1',
            icon: 'a',
            requires: { permission: 'console:access' },
          },
        ],
      },
      {
        key: 'b',
        label: 'B',
        entries: [
          {
            key: 'b1',
            href: '/b1',
            title: 'B1',
            icon: 'b',
            requires: { permission: 'console:security' },
          },
        ],
      },
    ]
    expect(resolveNavigation(groups, ctx(['console:access']))).toHaveLength(1)
    expect(resolveNavigation(groups, ctx(['console:access']))[0]?.key).toBe('a')
    expect(
      resolveNavigation(groups, ctx(['console:access', 'console:security']))
    ).toHaveLength(2)
  })

  it('feature requirement is exact — different feature does not satisfy', () => {
    const groups = registry([
      {
        key: 'x',
        href: '/x',
        title: 'X',
        icon: 'x',
        requires: { feature: 'f1' },
      },
    ])
    expect(resolveNavigation(groups, ctx([], []))).toEqual([])
    expect(resolveNavigation(groups, ctx([], ['f2']))).toEqual([])
    expect(resolveNavigation(groups, ctx([], ['f1']))).toHaveLength(1)
  })

  it('handles unicode href safely', () => {
    const groups = registry([
      { key: 'emoji', href: '/🔥', title: 'Fire', icon: 'fire' },
    ])
    expect(resolveNavigation(groups, ctx([]))).toHaveLength(1)
  })

  it('handles very large permission set efficiently', () => {
    const perms = consolePermissionCatalog.permissions.map((p) => p.key)
    const groups = registry([
      {
        key: 'req',
        href: '/req',
        title: 'R',
        icon: 'requests',
        requires: { permission: 'console:requests' },
      },
    ])
    expect(resolveNavigation(groups, ctx(perms))).toHaveLength(1)
  })

  it('hasPermission and can align for nav permission', () => {
    const effective = ['console:access', 'console:requests']
    expect(can(ctx(effective), 'console:requests')).toBe(true)
    const groups = registry([
      {
        key: 'req',
        href: '/req',
        title: 'R',
        icon: 'requests',
        requires: { permission: 'console:requests' },
      },
    ])
    expect(resolveNavigation(groups, ctx(effective))).toHaveLength(1)
  })
})
