import { resolveNavigation, type AccessContext } from '@876/core/access'
import { describe, expect, it } from 'vitest'

import { navConfig } from '@/components/shell/nav-config'
import { SETTINGS_NAVIGATION } from '@/components/shell/settings-options'
import { SYSTEM_ROLE_DEFINITIONS } from '@/lib/permissions'

function contextFor(role: string): AccessContext {
  const definition = SYSTEM_ROLE_DEFINITIONS.find(
    (entry) => entry.name === role
  )
  if (!definition) throw new Error(`Unknown system role: ${role}`)

  return {
    subject: { userId: 'user_test' },
    permissions: [...definition.permissions],
    features: [],
    experiments: {},
  }
}

function visibleHrefs(role: string): string[] {
  return resolveNavigation(navConfig, contextFor(role)).flatMap((group) =>
    group.entries.map((entry) => entry.href)
  )
}

describe('navConfig', () => {
  it('keeps the unlabelled sidebar entries in their declared groups', () => {
    expect(
      navConfig.map((group) => group.entries.map((entry) => entry.title))
    ).toEqual([
      ['Dashboards', 'Users', 'Organizations', 'Support', 'Security'],
      ['Apps', 'Widgets', 'Storage'],
      ['Reports', 'Settings'],
    ])
  })

  it('declares only string icon keys so the registry crosses the RSC boundary', () => {
    for (const group of navConfig)
      for (const entry of group.entries)
        expect(typeof entry.icon).toBe('string')
  })

  it('shows staff only the entries their role actually permits', () => {
    expect(visibleHrefs('staff')).toEqual([
      '/',
      '/users',
      '/orgs',
      '/support',
      '/apps',
      '/reports',
    ])
  })

  it('shows admin the management entries but not security', () => {
    expect(visibleHrefs('admin')).toEqual([
      '/',
      '/users',
      '/orgs',
      '/support',
      '/apps',
      '/widgets',
      '/storage',
      '/reports',
      '/settings',
    ])
  })

  it('shows owner every entry including security', () => {
    expect(visibleHrefs('owner')).toEqual([
      '/',
      '/users',
      '/orgs',
      '/support',
      '/security',
      '/apps',
      '/widgets',
      '/storage',
      '/reports',
      '/settings',
    ])
  })

  it('shows super_admin the same complete entry set as owner', () => {
    expect(visibleHrefs('super_admin')).toEqual(visibleHrefs('owner'))
  })

  it('hides every permission-gated entry from a context with no permissions', () => {
    const empty: AccessContext = {
      subject: { userId: 'user_test' },
      permissions: [],
      features: [],
      experiments: {},
    }

    expect(
      resolveNavigation(navConfig, empty).flatMap((group) =>
        group.entries.map((entry) => entry.href)
      )
    ).toEqual(['/'])
  })

  it('grants every navigation-required permission to at least one system role', () => {
    const required = [...navConfig, ...SETTINGS_NAVIGATION].flatMap((group) =>
      group.entries.flatMap((entry) =>
        entry.requires?.permission ? [entry.requires.permission] : []
      )
    )
    const granted = new Set(
      SYSTEM_ROLE_DEFINITIONS.flatMap((role) => role.permissions)
    )

    expect(required.filter((permission) => !granted.has(permission))).toEqual(
      []
    )
  })
})
