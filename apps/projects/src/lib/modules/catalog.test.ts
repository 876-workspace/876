import { projectsPermissionCatalog } from '@876/core/access/catalogs'
import { PROJECTS_MODULES } from '@876/core/modules'
import { describe, expect, it } from 'vitest'

import { PROJECTS_SURFACES } from './catalog'

const KEBAB_CASE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

describe('Projects surface catalog', () => {
  it('declares every surface key in canonical kebab-case', () => {
    for (const entry of PROJECTS_SURFACES) expect(entry.key).toMatch(KEBAB_CASE)
  })

  it('declares unique surface keys', () => {
    const keys = PROJECTS_SURFACES.map((entry) => entry.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('matches the permission catalog surface keys without treating them all as modules', () => {
    expect(PROJECTS_SURFACES.map((entry) => entry.key).toSorted()).toEqual(
      projectsPermissionCatalog.modules.map((entry) => entry.key).toSorted()
    )
    expect(Object.values(PROJECTS_MODULES).map((entry) => entry.key)).toEqual([
      'projects',
      'issues',
      'reports',
    ])
  })

  it('reuses canonical identity for real application modules', () => {
    const surfaces = new Map(
      PROJECTS_SURFACES.map((entry) => [entry.key, entry])
    )

    expect(surfaces.get('projects')?.label).toBe(
      PROJECTS_MODULES.projects.label
    )
    expect(surfaces.get('issues')?.description).toBe(
      PROJECTS_MODULES.issues.description
    )
    expect(surfaces.get('reports')?.label).toBe(PROJECTS_MODULES.reports.label)
  })

  it('marks exactly the product surfaces that exist today as available', () => {
    expect(
      PROJECTS_SURFACES.filter((entry) => entry.available).map(
        (entry) => entry.key
      )
    ).toEqual([
      'dashboard',
      'projects',
      'issues',
      'comments',
      'labels',
      'members',
      'settings',
    ])
  })
})
