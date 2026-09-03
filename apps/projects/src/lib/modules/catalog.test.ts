import { projectsPermissionCatalog } from '@876/core/access/catalogs'
import { describe, expect, it } from 'vitest'

import { PROJECTS_MODULES } from './catalog'

const KEBAB_CASE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

describe('Projects module catalog', () => {
  it('declares every module key in canonical kebab-case', () => {
    for (const entry of PROJECTS_MODULES) expect(entry.key).toMatch(KEBAB_CASE)
  })

  it('declares unique module keys', () => {
    const keys = PROJECTS_MODULES.map((entry) => entry.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('matches the permission catalog module keys exactly', () => {
    // Anti-drift: a entry without a permission entry cannot be gated, and a
    // permission entry without a entry entry is a surface nothing declares.
    expect(PROJECTS_MODULES.map((entry) => entry.key).toSorted()).toEqual(
      projectsPermissionCatalog.modules.map((entry) => entry.key).toSorted()
    )
  })

  it('marks exactly the modules whose surfaces exist as available', () => {
    expect(
      PROJECTS_MODULES.filter((entry) => entry.available).map(
        (entry) => entry.key
      )
    ).toEqual([
      'dashboard',
      'projects',
      'issues',
      'labels',
      'members',
      'settings',
    ])
  })
})
