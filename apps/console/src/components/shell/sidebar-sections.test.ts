import type { NavGroupDefinition } from '@876/core/access'
import { describe, expect, it } from 'vitest'

import { navConfig } from '@/components/shell/nav-config'
import {
  isNavSection,
  navSections,
  resolveActiveChildKey,
  resolveOpenSectionKey,
  type NavSection,
} from '@/components/shell/sidebar-sections'

/**
 * A registry that exercises two shapes: a section whose index child shares the
 * section root, which the real registry has, and a child living outside its
 * section's URL prefix, which it does not — that one pins the resolver's
 * contract over the data shape so an out-of-prefix child cannot regress.
 */
const REGISTRY: readonly NavGroupDefinition[] = [
  {
    key: 'primary',
    entries: [
      { key: 'dashboards', title: 'Dashboards', href: '/', icon: 'dashboard' },
      { key: 'users', title: 'Users', href: '/users', icon: 'users' },
      {
        key: 'projects',
        title: 'Projects',
        href: '/projects',
        icon: 'projects',
        children: [
          {
            key: 'overview',
            title: 'Overview',
            href: '/projects',
            icon: 'dashboard',
          },
          {
            key: 'issues',
            title: 'Issues',
            href: '/projects/issues',
            icon: 'issues',
          },
        ],
      },
      {
        key: 'requests',
        title: 'Requests',
        href: '/requests',
        icon: 'support',
        children: [
          {
            key: 'list',
            title: 'Requests',
            href: '/requests',
            icon: 'support',
          },
          {
            key: 'outside',
            title: 'Elsewhere',
            href: '/elsewhere',
            icon: 'support',
          },
        ],
      },
    ],
  },
]

const projects = navSections(REGISTRY)[0] as NavSection
const requests = navSections(REGISTRY)[1] as NavSection

describe('isNavSection', () => {
  it('accepts an entry with at least one child', () => {
    expect(isNavSection(projects)).toBe(true)
  })

  it('rejects an entry with no children field', () => {
    expect(
      isNavSection({ key: 'users', title: 'Users', href: '/users', icon: 'u' })
    ).toBe(false)
  })

  it('rejects an entry whose children resolved away to an empty list', () => {
    expect(
      isNavSection({
        key: 'empty',
        title: 'Empty',
        href: '/empty',
        icon: 'e',
        children: [],
      })
    ).toBe(false)
  })
})

describe('navSections', () => {
  it('returns only the drill-down entries, in sidebar order', () => {
    expect(navSections(REGISTRY).map((section) => section.key)).toEqual([
      'projects',
      'requests',
    ])
  })

  it('returns an empty list for a registry with no sections', () => {
    expect(
      navSections([
        {
          key: 'flat',
          entries: [
            { key: 'users', title: 'Users', href: '/users', icon: 'users' },
          ],
        },
      ])
    ).toEqual([])
  })
})

describe('resolveOpenSectionKey', () => {
  it('returns null on a path that belongs to no section', () => {
    expect(resolveOpenSectionKey('/users', REGISTRY)).toBeNull()
  })

  it('returns null on the dashboard, whose href would prefix-match everything', () => {
    expect(resolveOpenSectionKey('/', REGISTRY)).toBeNull()
  })

  it('opens the section when the path is the section root', () => {
    expect(resolveOpenSectionKey('/projects', REGISTRY)).toBe('projects')
  })

  it('opens the section from a nested route under it', () => {
    expect(resolveOpenSectionKey('/projects/issues/ISS-1', REGISTRY)).toBe(
      'projects'
    )
  })

  it('opens the section from a child href outside the section prefix', () => {
    expect(resolveOpenSectionKey('/elsewhere', REGISTRY)).toBe('requests')
  })

  it('does not open a section for a sibling route sharing its prefix', () => {
    expect(resolveOpenSectionKey('/projects-archive', REGISTRY)).toBeNull()
  })
})

describe('resolveActiveChildKey', () => {
  it('prefers the longest matching child over the section index', () => {
    expect(resolveActiveChildKey('/projects/issues', projects)).toBe('issues')
  })

  it('keeps the longest match on a nested route of that child', () => {
    expect(resolveActiveChildKey('/projects/issues/ISS-1', projects)).toBe(
      'issues'
    )
  })

  it('falls back to the index child on the section root', () => {
    expect(resolveActiveChildKey('/projects', projects)).toBe('overview')
  })

  it('keeps the index child active on a record route it owns', () => {
    expect(resolveActiveChildKey('/requests/req_1', requests)).toBe('list')
  })

  it('returns null when no child owns the path', () => {
    expect(resolveActiveChildKey('/users', projects)).toBeNull()
  })
})

describe('the real Console registry', () => {
  it('declares drill-down sections only for Projects and Requests', () => {
    expect(navSections(navConfig).map((section) => section.key)).toEqual([
      'projects',
      'requests',
    ])
  })

  it('gives every section child a string icon key so the registry stays serializable', () => {
    for (const section of navSections(navConfig))
      for (const child of section.children) {
        expect(typeof child.icon).toBe('string')
        expect(typeof child.href).toBe('string')
      }
  })

  it('gates every section child on the same permission as its section', () => {
    for (const section of navSections(navConfig))
      for (const child of section.children)
        expect(child.requires?.permission, child.href).toBe(
          section.requires?.permission
        )
  })
})
