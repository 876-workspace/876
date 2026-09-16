import { describe, expect, it } from 'vitest'

import { resolveNavIcon } from './nav-icons'
import { navConfig } from './nav-config'

function projectsEntry() {
  const entry = navConfig
    .flatMap((group) => group.entries)
    .find((candidate) => candidate.key === 'projects')
  if (!entry?.children) throw new Error('Projects entry has no children')
  return entry
}

describe('Projects platform navigation children', () => {
  it('lists every read-only rollout section under /projects', () => {
    expect(projectsEntry().children!.map((child) => child.href)).toEqual([
      '/projects',
      '/projects/projects',
      '/projects/issues',
      '/projects/board',
      '/projects/labels',
      '/projects/phases',
      '/projects/cycles',
      '/projects/task-lists',
      '/projects/calendar',
      '/projects/time',
      '/projects/templates',
    ])
  })

  it('gates every child on the same permission its route guard checks', () => {
    for (const child of projectsEntry().children!) {
      expect(child.requires?.permission).toBe('projects/dashboard.view')
    }
  })

  it('resolves a distinct icon for every child in the drill-down rail', () => {
    const icons = projectsEntry().children!.map((child) =>
      resolveNavIcon(child.icon)
    )
    expect(new Set(icons).size).toBe(icons.length)
  })
})
