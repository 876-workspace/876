import { describe, expect, it } from 'vitest'

import type { AccessContext } from './context'
import {
  defineNavigation,
  resolveNavigation,
  type NavGroupDefinition,
} from './navigation'

function context(overrides: Partial<AccessContext> = {}): AccessContext {
  return {
    subject: { userId: 'user_695d45c54a374ff0a570003e15668891' },
    permissions: [],
    features: [],
    experiments: {},
    ...overrides,
  }
}

function registry(
  entries: NavGroupDefinition['entries']
): readonly NavGroupDefinition[] {
  return defineNavigation([{ key: 'main', label: 'Main', entries }])
}

describe('defineNavigation', () => {
  it('returns the declarative groups unchanged', () => {
    const groups = registry([
      { key: 'home', title: 'Home', href: '/', icon: 'home' },
    ])

    const result = defineNavigation(groups)

    expect(result).toBe(groups)
  })
})

describe('resolveNavigation', () => {
  it('keeps an entry with no requirements', () => {
    const groups = registry([
      { key: 'home', title: 'Home', href: '/', icon: 'home' },
    ])

    const result = resolveNavigation(groups, context())

    expect(result[0]?.entries.map((entry) => entry.href)).toEqual(['/'])
  })

  it('keeps an entry when its required permission is held', () => {
    const groups = registry([
      {
        key: 'users',
        title: 'Users',
        href: '/users',
        icon: 'users',
        requires: { permission: 'users:list' },
      },
    ])

    const result = resolveNavigation(
      groups,
      context({ permissions: ['users:list'] })
    )

    expect(result[0]?.entries.map((entry) => entry.href)).toEqual(['/users'])
  })

  it('hides an entry when its required permission is missing', () => {
    const groups = registry([
      {
        key: 'users',
        title: 'Users',
        href: '/users',
        icon: 'users',
        requires: { permission: 'users:list' },
      },
    ])

    const result = resolveNavigation(groups, context())

    expect(result).toEqual([])
  })

  it('keeps an entry when its required feature is enabled', () => {
    const groups = registry([
      {
        key: 'reports',
        title: 'Reports',
        href: '/reports',
        icon: 'reports',
        requires: { feature: 'console_reports' },
      },
    ])

    const result = resolveNavigation(
      groups,
      context({ features: ['console_reports'] })
    )

    expect(result[0]?.entries.map((entry) => entry.href)).toEqual(['/reports'])
  })

  it('hides an entry when its required feature is disabled', () => {
    const groups = registry([
      {
        key: 'reports',
        title: 'Reports',
        href: '/reports',
        icon: 'reports',
        requires: { feature: 'console_reports' },
      },
    ])

    const result = resolveNavigation(groups, context())

    expect(result).toEqual([])
  })

  it('keeps an entry when both permission and feature requirements pass', () => {
    const groups = registry([
      {
        key: 'reports',
        title: 'Reports',
        href: '/reports',
        icon: 'reports',
        requires: {
          permission: 'console:reports',
          feature: 'console_reports',
        },
      },
    ])

    const result = resolveNavigation(
      groups,
      context({
        permissions: ['console:reports'],
        features: ['console_reports'],
      })
    )

    expect(result[0]?.entries.map((entry) => entry.href)).toEqual(['/reports'])
  })

  it('hides an entry when permission passes but feature fails', () => {
    const groups = registry([
      {
        key: 'reports',
        title: 'Reports',
        href: '/reports',
        icon: 'reports',
        requires: {
          permission: 'console:reports',
          feature: 'console_reports',
        },
      },
    ])

    const result = resolveNavigation(
      groups,
      context({ permissions: ['console:reports'] })
    )

    expect(result).toEqual([])
  })

  it('hides an entry when feature passes but permission fails', () => {
    const groups = registry([
      {
        key: 'reports',
        title: 'Reports',
        href: '/reports',
        icon: 'reports',
        requires: {
          permission: 'console:reports',
          feature: 'console_reports',
        },
      },
    ])

    const result = resolveNavigation(
      groups,
      context({ features: ['console_reports'] })
    )

    expect(result).toEqual([])
  })

  it('keeps an anyPermission entry when one permission is held', () => {
    const groups = registry([
      {
        key: 'people',
        title: 'People',
        href: '/people',
        icon: 'users',
        requires: { anyPermission: ['users:list', 'team:list'] },
      },
    ])

    const result = resolveNavigation(
      groups,
      context({ permissions: ['team:list'] })
    )

    expect(result[0]?.entries.map((entry) => entry.href)).toEqual(['/people'])
  })

  it('hides an anyPermission entry when none are held', () => {
    const groups = registry([
      {
        key: 'people',
        title: 'People',
        href: '/people',
        icon: 'users',
        requires: { anyPermission: ['users:list', 'team:list'] },
      },
    ])

    const result = resolveNavigation(groups, context())

    expect(result).toEqual([])
  })

  it('treats an empty anyPermission array as unsatisfiable', () => {
    const groups = registry([
      {
        key: 'people',
        title: 'People',
        href: '/people',
        icon: 'users',
        requires: { anyPermission: [] },
      },
    ])

    const result = resolveNavigation(groups, context())

    expect(result).toEqual([])
  })

  it('ANDs anyPermission with a required feature', () => {
    const groups = registry([
      {
        key: 'people',
        title: 'People',
        href: '/people',
        icon: 'users',
        requires: {
          anyPermission: ['users:list', 'team:list'],
          feature: 'console_people',
        },
      },
    ])

    const result = resolveNavigation(
      groups,
      context({
        permissions: ['users:list'],
        features: ['console_people'],
      })
    )

    expect(result[0]?.entries.map((entry) => entry.href)).toEqual(['/people'])
  })

  it('hides anyPermission when its feature requirement fails', () => {
    const groups = registry([
      {
        key: 'people',
        title: 'People',
        href: '/people',
        icon: 'users',
        requires: {
          anyPermission: ['users:list', 'team:list'],
          feature: 'console_people',
        },
      },
    ])

    const result = resolveNavigation(
      groups,
      context({ permissions: ['users:list'] })
    )

    expect(result).toEqual([])
  })

  it('requires both permission and anyPermission when both are declared', () => {
    const groups = registry([
      {
        key: 'people',
        title: 'People',
        href: '/people',
        icon: 'users',
        requires: {
          permission: 'console:users',
          anyPermission: ['users:list', 'team:list'],
        },
      },
    ])

    const result = resolveNavigation(
      groups,
      context({ permissions: ['console:users', 'team:list'] })
    )

    expect(result[0]?.entries.map((entry) => entry.href)).toEqual(['/people'])
  })

  it('hides an entry when permission passes but anyPermission fails', () => {
    const groups = registry([
      {
        key: 'people',
        title: 'People',
        href: '/people',
        icon: 'users',
        requires: {
          permission: 'console:users',
          anyPermission: ['users:list', 'team:list'],
        },
      },
    ])

    const result = resolveNavigation(
      groups,
      context({ permissions: ['console:users'] })
    )

    expect(result).toEqual([])
  })

  it('filters children before retaining their parent', () => {
    const groups = registry([
      {
        key: 'settings',
        title: 'Settings',
        href: '/settings',
        icon: 'settings',
        children: [
          {
            key: 'team',
            title: 'Team',
            href: '/settings/users',
            icon: 'users',
            requires: { permission: 'team:list' },
          },
          {
            key: 'roles',
            title: 'Roles',
            href: '/settings/users/roles',
            icon: 'roles',
            requires: { permission: 'roles:list' },
          },
        ],
      },
    ])

    const result = resolveNavigation(
      groups,
      context({ permissions: ['team:list'] })
    )

    expect(result[0]?.entries[0]?.children?.map((entry) => entry.href)).toEqual(
      ['/settings/users']
    )
  })

  it('removes a parent whose declared children all filter out', () => {
    const groups = registry([
      {
        key: 'settings',
        title: 'Settings',
        href: '/settings',
        icon: 'settings',
        children: [
          {
            key: 'roles',
            title: 'Roles',
            href: '/settings/users/roles',
            icon: 'roles',
            requires: { permission: 'roles:list' },
          },
        ],
      },
    ])

    const result = resolveNavigation(groups, context())

    expect(result).toEqual([])
  })

  it('removes a hidden parent even when one child is visible', () => {
    const groups = registry([
      {
        key: 'settings',
        title: 'Settings',
        href: '/settings',
        icon: 'settings',
        requires: { permission: 'console:settings' },
        children: [
          {
            key: 'team',
            title: 'Team',
            href: '/settings/users',
            icon: 'users',
          },
        ],
      },
    ])

    const result = resolveNavigation(groups, context())

    expect(result).toEqual([])
  })

  it('drops a group when every entry filters out', () => {
    const groups = defineNavigation([
      {
        key: 'main',
        entries: [
          {
            key: 'users',
            title: 'Users',
            href: '/users',
            icon: 'users',
            requires: { permission: 'users:list' },
          },
        ],
      },
      {
        key: 'public',
        entries: [{ key: 'home', title: 'Home', href: '/', icon: 'home' }],
      },
    ])

    const result = resolveNavigation(groups, context())

    expect(result.map((group) => group.key)).toEqual(['public'])
  })

  it('resolves navigation nested two levels deep', () => {
    const groups = registry([
      {
        key: 'settings',
        title: 'Settings',
        href: '/settings',
        icon: 'settings',
        children: [
          {
            key: 'access',
            title: 'Access',
            href: '/settings/access',
            icon: 'shield',
            children: [
              {
                key: 'roles',
                title: 'Roles',
                href: '/settings/access/roles',
                icon: 'roles',
                requires: { permission: 'roles:list' },
              },
            ],
          },
        ],
      },
    ])

    const result = resolveNavigation(
      groups,
      context({ permissions: ['roles:list'] })
    )

    expect(result[0]?.entries[0]?.children?.[0]?.children?.[0]?.href).toBe(
      '/settings/access/roles'
    )
  })

  it('returns structurally cloneable plain data', () => {
    const groups = registry([
      {
        key: 'users',
        title: 'Users',
        href: '/users',
        icon: 'users',
        colorClassName: 'text-blue-500',
        requires: { permission: 'users:list' },
      },
    ])

    const result = resolveNavigation(
      groups,
      context({ permissions: ['users:list'] })
    )

    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
  })

  it('does not mutate the input registry', () => {
    const groups = registry([
      {
        key: 'users',
        title: 'Users',
        href: '/users',
        icon: 'users',
        requires: { anyPermission: ['users:list', 'users:read'] },
      },
    ])
    const before = JSON.parse(JSON.stringify(groups))

    resolveNavigation(groups, context({ permissions: ['users:list'] }))

    expect(groups).toEqual(before)
  })

  it('returns a new top-level array', () => {
    const groups = registry([
      { key: 'home', title: 'Home', href: '/', icon: 'home' },
    ])

    const result = resolveNavigation(groups, context())

    expect(result).not.toBe(groups)
  })

  it('returns new entry objects instead of sharing input objects', () => {
    const groups = registry([
      { key: 'home', title: 'Home', href: '/', icon: 'home' },
    ])

    const result = resolveNavigation(groups, context())

    expect(result[0]?.entries[0]).not.toBe(groups[0]?.entries[0])
  })

  it('fails closed for malformed group input', () => {
    const malformed = null as unknown as readonly NavGroupDefinition[]

    const result = resolveNavigation(malformed, context())

    expect(result).toEqual([])
  })

  it('keeps public entries and hides gated entries for a malformed context', () => {
    const groups = registry([
      { key: 'home', title: 'Home', href: '/', icon: 'home' },
      {
        key: 'users',
        title: 'Users',
        href: '/users',
        icon: 'users',
        requires: { permission: 'users:list' },
      },
    ])

    const result = resolveNavigation(groups, null as unknown as AccessContext)

    expect(result[0]?.entries.map((entry) => entry.href)).toEqual(['/'])
  })

  it('preserves an entry active class and omits it when absent', () => {
    const groups = defineNavigation([
      {
        key: 'primary',
        entries: [
          {
            key: 'tinted',
            title: 'Tinted',
            href: '/tinted',
            icon: 'tinted',
            activeClassName: 'bg-blue-500/12 ring-blue-500/30',
          },
          { key: 'plain', title: 'Plain', href: '/plain', icon: 'plain' },
        ],
      },
    ])

    const resolved = resolveNavigation(groups, {
      subject: { userId: 'user_1' },
      permissions: [],
      features: [],
      experiments: {},
    })

    expect(resolved[0]?.entries[0]?.activeClassName).toBe(
      'bg-blue-500/12 ring-blue-500/30'
    )
    expect(resolved[0]?.entries[1]).not.toHaveProperty('activeClassName')
  })

  it('preserves group labels and entry color classes', () => {
    const groups = registry([
      {
        key: 'home',
        title: 'Home',
        href: '/',
        icon: 'home',
        colorClassName: 'text-blue-500',
      },
    ])

    const result = resolveNavigation(groups, context())

    expect(result).toEqual([
      {
        key: 'main',
        label: 'Main',
        entries: [
          {
            key: 'home',
            title: 'Home',
            href: '/',
            icon: 'home',
            colorClassName: 'text-blue-500',
          },
        ],
      },
    ])
  })
})
