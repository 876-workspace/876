import { resolveNavigation } from '@876/core/access'
import { describe, expect, it } from 'vitest'

import { resolveCustomModuleNavEntries } from '@/lib/custom-modules/module-access'

import { navConfig } from './nav-config'

describe('custom module navigation binding', () => {
  it('adds one sidebar entry per org-scope module', () => {
    const group = resolveCustomModuleNavEntries([
      { key: 'risks', pluralName: 'Risks', icon: 'forms' },
      { key: 'decisions', pluralName: 'Decisions', icon: 'reports' },
    ])
    expect(group.entries.map((entry) => entry.href)).toEqual(['/m/risks', '/m/decisions'])
  })

  it('keeps entries serializable for the server-resolved shell', () => {
    const group = resolveCustomModuleNavEntries([
      { key: 'risks', pluralName: 'Risks', icon: 'forms' },
    ])
    expect(JSON.parse(JSON.stringify(group))).toEqual(group)
  })

  it('guards module entries on projects.view like the reports entry', () => {
    const group = resolveCustomModuleNavEntries([
      { key: 'risks', pluralName: 'Risks', icon: 'forms' },
    ])
    expect(group.entries[0]?.requires).toMatchObject({ permission: 'projects.view' })
  })

  it('shows module entries to a projects viewer', () => {
    const resolved = resolveNavigation(
      [
        ...navConfig,
        resolveCustomModuleNavEntries([{ key: 'risks', pluralName: 'Risks', icon: 'forms' }]),
      ],
      {
        subject: { userId: 'user_1' },
        modules: ['projects'],
        permissions: ['dashboard.view', 'projects.view'],
        features: [],
        experiments: {},
      }
    )
    expect(resolved.flatMap((group) => group.entries.map((entry) => entry.href))).toContain(
      '/m/risks'
    )
  })

  it('hides module entries without projects.view', () => {
    const resolved = resolveNavigation(
      [
        ...navConfig,
        resolveCustomModuleNavEntries([{ key: 'risks', pluralName: 'Risks', icon: 'forms' }]),
      ],
      {
        subject: { userId: 'user_1' },
        modules: ['projects'],
        permissions: ['dashboard.view'],
        features: [],
        experiments: {},
      }
    )
    expect(resolved.flatMap((group) => group.entries.map((entry) => entry.href))).not.toContain(
      '/m/risks'
    )
  })

  it('leaves the static registry href set untouched', () => {
    expect(
      resolveNavigation(navConfig, {
        subject: { userId: 'user_1' },
        modules: ['projects', 'issues'],
        permissions: ['dashboard.view', 'projects.view', 'projects.edit', 'issues.view', 'labels.view', 'members.view', 'settings.view'],
        features: [],
        experiments: {},
      }).flatMap((group) => group.entries.map((entry) => entry.href))
    ).toContain('/reports')
  })
})
