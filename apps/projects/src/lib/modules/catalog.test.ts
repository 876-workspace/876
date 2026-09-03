import { projectsPermissionCatalog } from '@876/core/access/catalogs'
import { describe, expect, it } from 'vitest'

import { PROJECTS_MODULES } from './catalog'

const KEBAB_CASE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

describe('Projects module catalog', () => {
  it('declares every module key in canonical kebab-case', () => {
    for (const module of PROJECTS_MODULES)
      expect(module.key).toMatch(KEBAB_CASE)
  })

  it('declares unique module keys', () => {
    const keys = PROJECTS_MODULES.map((module) => module.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('matches the permission catalog module keys exactly', () => {
    // Anti-drift: a module without a permission module cannot be gated, and a
    // permission module without a module entry is a surface nothing declares.
    expect(PROJECTS_MODULES.map((module) => module.key).toSorted()).toEqual(
      projectsPermissionCatalog.modules.map((module) => module.key).toSorted()
    )
  })

  it('marks exactly the modules whose surfaces exist as available', () => {
    expect(
      PROJECTS_MODULES.filter((module) => module.available).map(
        (module) => module.key
      )
    ).toEqual(['dashboard', 'members', 'settings'])
  })
})
