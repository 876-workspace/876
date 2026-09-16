import { can, resolveNavigation, type AccessContext } from '@876/core/access'
import { projectsPermissionCatalog } from '@876/core/access/catalogs'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { navConfig } from './nav-config'
import { NAV_ICONS } from './nav-icons'
import { MobileNav } from './mobile-nav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/issues',
}))

function context(
  permissions: string[],
  features: string[] = [],
  modules: string[] = ['projects', 'issues']
): AccessContext {
  return {
    subject: { userId: 'user_1' },
    modules,
    permissions,
    features,
    experiments: {},
  }
}

function routeSource(href: string): string {
  const segment = href === '/' ? '' : href
  const candidates = [
    `src/app/(app)${segment}/page.tsx`,
    `src/app/(app)${segment}/layout.tsx`,
    `src/app/(app)${segment}/(list)/page.tsx`,
  ]

  for (const candidate of candidates) {
    const file = join(process.cwd(), candidate)
    if (existsSync(file)) return readFileSync(file, 'utf8')
  }

  throw new Error(`No guarded route source found for ${href}`)
}

/**
 * Reads the permission each destination route actually guards on, so the
 * binding assertion compares the registry against source rather than a second
 * hand-maintained permission map.
 */
function guardedPermissionOf(href: string): string {
  const source = routeSource(href)
  const direct = source.match(/requireAppPermission\(\s*'([^']+)'/)
  if (direct) return direct[1]

  const moduleAware = source.match(
    /requireAppAccess\(\s*\{[\s\S]*?permission:\s*'([^']+)'[\s\S]*?\}\s*\)/
  )
  if (moduleAware) return moduleAware[1]

  throw new Error(`No app permission guard found for ${href}`)
}

function guardedModuleOf(href: string): string | null {
  const source = routeSource(href)
  const moduleAware = source.match(
    /requireAppAccess\(\s*\{[\s\S]*?module:\s*'([^']+)'[\s\S]*?\}\s*\)/
  )
  return moduleAware?.[1] ?? null
}

describe('Projects navigation access binding', () => {
  it('shows the exact permission-rich href set when commercial modules are entitled', () => {
    expect(
      resolveNavigation(
        navConfig,
        context(projectsPermissionCatalog.permissions.map(({ key }) => key))
      ).flatMap((group) => group.entries.map(({ href }) => href))
    ).toEqual([
      '/',
      '/projects',
      '/phases',
      '/cycles',
      '/calendar',
      '/my-work',
      '/time',
      '/reports',
      '/issues',
      '/board',
      '/labels',
      '/settings/users',
      '/settings',
    ])
  })

  it('shows only the dashboard to a dashboard-only member', () => {
    expect(
      resolveNavigation(navConfig, context(['dashboard.view'])).flatMap(
        (group) => group.entries.map(({ href }) => href)
      )
    ).toEqual(['/'])
  })

  it('removes entries whose permission is absent', () => {
    expect(
      resolveNavigation(navConfig, context(['dashboard.view'])).flatMap(
        (group) => group.entries.map(({ href }) => href)
      )
    ).not.toContain('/projects')
  })

  it('removes Projects, Phases, and Cycles when projects is not entitled', () => {
    const hrefs = resolveNavigation(
      navConfig,
      context(['projects.view', 'issues.view'], [], ['issues'])
    ).flatMap((group) => group.entries.map(({ href }) => href))

    expect(hrefs).not.toContain('/projects')
    expect(hrefs).not.toContain('/phases')
    expect(hrefs).not.toContain('/cycles')
    expect(hrefs).not.toContain('/calendar')
    expect(hrefs).not.toContain('/my-work')
    expect(hrefs).toContain('/issues')
  })

  it('places Calendar and My Work directly after Cycles', () => {
    const hrefs = navConfig.flatMap((group) =>
      group.entries.map(({ href }) => href)
    )

    expect(hrefs.indexOf('/calendar')).toBe(hrefs.indexOf('/cycles') + 1)
    expect(hrefs.indexOf('/my-work')).toBe(hrefs.indexOf('/calendar') + 1)
  })

  it('gates Calendar and My Work on the projects module and its view permission', () => {
    const entries = navConfig
      .flatMap((group) => group.entries)
      .filter(({ href }) => href === '/calendar' || href === '/my-work')

    expect(entries.map(({ title }) => title)).toEqual(['Calendar', 'My Work'])
    for (const entry of entries)
      expect(entry.requires).toEqual({
        module: 'projects',
        permission: 'projects.view',
      })
  })

  it('resolves every navigation icon key to an icon the rail can draw', () => {
    for (const entry of navConfig.flatMap((group) => group.entries))
      expect(Object.keys(NAV_ICONS)).toContain(entry.icon)
  })

  it('removes Issues, Board, and Labels when the issues module is not entitled', () => {
    const hrefs = resolveNavigation(
      navConfig,
      context(['projects.view', 'issues.view', 'labels.view'], [], ['projects'])
    ).flatMap((group) => group.entries.map(({ href }) => href))

    expect(hrefs).toContain('/projects')
    expect(hrefs).toContain('/phases')
    expect(hrefs).toContain('/cycles')
    expect(hrefs).not.toContain('/issues')
    expect(hrefs).not.toContain('/board')
    expect(hrefs).not.toContain('/labels')
  })

  it('returns structurally cloneable server output without mutating the registry', () => {
    const before = structuredClone(navConfig)
    const resolved = resolveNavigation(navConfig, context(['dashboard.view']))
    expect(structuredClone(resolved)).toEqual(resolved)
    expect(navConfig).toEqual(before)
  })

  it('binds every navigation permission to the destination route guard', () => {
    for (const entry of navConfig.flatMap((group) => group.entries))
      expect(entry.requires?.permission).toBe(guardedPermissionOf(entry.href))
  })

  it('binds every module-gated navigation entry to the destination route module guard', () => {
    for (const entry of navConfig.flatMap((group) => group.entries)) {
      if (!entry.requires?.module) continue
      expect(guardedModuleOf(entry.href)).toBe(entry.requires.module)
    }
  })

  it('requires only permissions granted by a seeded role template', () => {
    const superAdminPermissions = projectsPermissionCatalog.permissions.map(
      ({ key }) => key
    )
    for (const entry of navConfig.flatMap((group) => group.entries))
      expect(superAdminPermissions).toContain(entry.requires?.permission)
  })

  it('does not treat a feature as a permission', () => {
    expect(can(context([], ['projects-search-bar']), 'dashboard.view')).toBe(
      false
    )
  })

  it('lists every navigation entry by label in the mobile navigation sheet', async () => {
    const navigation = resolveNavigation(
      navConfig,
      context(projectsPermissionCatalog.permissions.map(({ key }) => key))
    )

    render(
      createElement(MobileNav, {
        apps: [],
        currentOrg: { id: 'org_1', name: 'Acme', slug: 'acme' },
        navigation,
        orgs: [],
        uiFeatures: {
          searchBar: false,
          themeSwitcher: false,
          globalAdd: false,
          appSwitcher: false,
          orgSwitcher: false,
        },
      })
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))

    const navigationSheet = await screen.findByRole('navigation', {
      name: 'Projects navigation',
    })
    for (const entry of navigation.flatMap((group) => group.entries))
      expect(
        screen.getByRole('link', { name: entry.title })
      ).toBeInTheDocument()

    expect(navigationSheet).toBeInTheDocument()
  })
})
