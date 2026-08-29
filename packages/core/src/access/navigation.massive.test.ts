import { describe, expect, it } from 'vitest'
import {
  defineNavigation,
  resolveNavigation,
  type NavGroupDefinition,
} from './navigation'
import type { AccessContext } from './context'
import {
  consolePermissionCatalog,
  adaptStoredConsolePermissions,
} from './catalogs'
import { resolveEffectivePermissions } from './index'

function ctx(perms: string[], feats: string[] = []): AccessContext {
  return {
    subject: { userId: 'u' },
    permissions: perms,
    features: feats,
    experiments: {},
  }
}
function reg(entries: NavGroupDefinition['entries']): NavGroupDefinition[] {
  return [{ key: 'main', label: 'Main', entries }]
}

describe('navigation massive — access control', () => {
  it.each([
    ['console:requests', '/requests'],
    ['console:users', '/users'],
    ['console:security', '/security'],
  ])('nav %s maps to %s', (perm, href) => {
    const groups = reg([
      { key: 'e', title: 'E', href, icon: 'i', requires: { permission: perm } },
    ])
    expect(resolveNavigation(groups, ctx([]))).toEqual([])
    expect(resolveNavigation(groups, ctx([perm]))[0]?.entries[0]?.href).toBe(
      href
    )
  })

  it('legacy support does NOT open requests nav without adaptation', () => {
    const groups = reg([
      {
        key: 'req',
        title: 'Req',
        href: '/requests',
        icon: 'i',
        requires: { permission: 'console:requests' },
      },
    ])
    expect(resolveNavigation(groups, ctx(['console:support']))).toEqual([])
    const adapted = adaptStoredConsolePermissions(['console:support'])
    const eff = resolveEffectivePermissions({
      role: { permissions: adapted },
      catalog: consolePermissionCatalog,
    })
    expect(resolveNavigation(groups, ctx(eff))).toHaveLength(1)
  })

  it('anyPermission with single hit opens', () => {
    const groups = reg([
      {
        key: 'e',
        href: '/e',
        title: 'E',
        icon: 'i',
        requires: { anyPermission: ['team:list', 'users:list'] },
      },
    ])
    expect(resolveNavigation(groups, ctx(['team:list']))).toHaveLength(1)
    expect(resolveNavigation(groups, ctx(['users:list']))).toHaveLength(1)
    expect(resolveNavigation(groups, ctx([]))).toEqual([])
  })

  it('feature gate blocks without feature', () => {
    const groups = reg([
      {
        key: 'r',
        href: '/reports',
        title: 'R',
        icon: 'i',
        requires: { permission: 'console:reports', feature: 'console_reports' },
      },
    ])
    expect(resolveNavigation(groups, ctx(['console:reports'], []))).toEqual([])
    expect(
      resolveNavigation(groups, ctx(['console:reports'], ['console_reports']))
    ).toHaveLength(1)
  })

  it('entries without requires always visible even with empty context', () => {
    const groups = reg([
      { key: 'home', href: '/', title: 'Home', icon: 'home' },
    ])
    expect(resolveNavigation(groups, ctx([]))).toHaveLength(1)
    expect(resolveNavigation(groups, ctx([], []))[0]?.entries[0]?.href).toBe(
      '/'
    )
  })

  it('handles 50 entries stress', () => {
    const entries = Array.from({ length: 50 }, (_, i) => ({
      key: `k${i}`,
      title: `T${i}`,
      href: `/p${i}`,
      icon: 'i',
      requires: { permission: 'console:access' },
    }))
    const groups = reg(entries)
    expect(resolveNavigation(groups, ctx([]))).toEqual([])
    expect(
      resolveNavigation(groups, ctx(['console:access']))[0]?.entries
    ).toHaveLength(50)
  })

  it('defineNavigation is identity but safe for empty', () => {
    expect(defineNavigation([])).toEqual([])
    const g = reg([{ key: 'a', title: 'A', href: '/a', icon: 'i' }])
    expect(defineNavigation(g)).toEqual(g)
  })

  it('malformed groups fail closed empty without throw', () => {
    expect(() =>
      resolveNavigation(null as unknown as NavGroupDefinition[], ctx([]))
    ).not.toThrow()
    expect(
      resolveNavigation(null as unknown as NavGroupDefinition[], ctx([]))
    ).toEqual([])
    expect(() =>
      resolveNavigation(
        [
          {
            key: 'x',
            entries: null as unknown as NavGroupDefinition['entries'],
          },
        ] as unknown as NavGroupDefinition[],
        ctx([])
      )
    ).not.toThrow()
  })

  it('children filtered recursively', () => {
    const groups: NavGroupDefinition[] = [
      {
        key: 'main',
        label: 'Main',
        entries: [
          {
            key: 'parent',
            title: 'Parent',
            href: '/parent',
            icon: 'i',
            children: [
              {
                key: 'child',
                title: 'Child',
                href: '/parent/child',
                icon: 'i',
                requires: { permission: 'console:security' },
              },
              {
                key: 'child2',
                title: 'Child2',
                href: '/parent/child2',
                icon: 'i',
              },
            ],
          },
        ],
      },
    ]
    expect(
      resolveNavigation(groups, ctx([]))[0]?.entries[0]?.children
    ).toHaveLength(1)
    expect(
      resolveNavigation(groups, ctx(['console:security']))[0]?.entries[0]
        ?.children
    ).toHaveLength(2)
  })

  it('preserves icon and href exactly', () => {
    const groups = reg([
      {
        key: 'e',
        title: 'E',
        href: '/🔥',
        icon: 'fire',
        requires: { permission: 'console:access' },
      },
    ])
    const res = resolveNavigation(groups, ctx(['console:access']))[0]
      ?.entries[0]
    expect(res?.href).toBe('/🔥')
    expect(res?.icon).toBe('fire')
  })
})
