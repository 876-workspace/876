import { describe, expect, it } from 'vitest'

import { hasWriteScope, validateConfig } from './config'

describe('write scopes', () => {
  it('treats a missing PROJECTS_SCOPES as full operator access', () => {
    const config = validateConfig({
      PROJECTS_INTERNAL_KEY: 'key',
      PROJECTS_ORGANIZATION_ID: 'org_1',
    })
    expect(config.scopes).toBeUndefined()
    expect(hasWriteScope(config)).toBe(true)
  })

  it('parses comma-separated scopes and enforces projects:write', () => {
    const allowed = validateConfig({
      PROJECTS_INTERNAL_KEY: 'key',
      PROJECTS_ORGANIZATION_ID: 'org_1',
      PROJECTS_SCOPES: 'projects:read, projects:write',
    })
    expect(allowed.scopes).toEqual(['projects:read', 'projects:write'])
    expect(hasWriteScope(allowed)).toBe(true)

    const denied = validateConfig({
      PROJECTS_INTERNAL_KEY: 'key',
      PROJECTS_ORGANIZATION_ID: 'org_1',
      PROJECTS_SCOPES: 'projects:read',
    })
    expect(hasWriteScope(denied)).toBe(false)
  })

  it('deduplicates scopes and ignores blank entries', () => {
    const config = validateConfig({
      PROJECTS_INTERNAL_KEY: 'key',
      PROJECTS_ORGANIZATION_ID: 'org_1',
      PROJECTS_SCOPES: ' projects:read,, projects:read ',
    })
    expect(config.scopes).toEqual(['projects:read'])
    expect(hasWriteScope(config)).toBe(false)
  })
})
