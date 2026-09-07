import { describe, expect, it } from 'vitest'

import { ConfigError, DEFAULT_PROJECTS_API_URL, validateConfig } from './config'

describe('config', () => {
  it('defaults PROJECTS_API_URL to the production 876 Projects API', () => {
    const config = validateConfig({
      PROJECTS_INTERNAL_KEY: 'test-key',
      PROJECTS_ORGANIZATION_ID: 'org_test',
    })

    expect(config.apiUrl).toBe(DEFAULT_PROJECTS_API_URL)
    expect(config.apiUrl).toBe('https://876-projects-api.vercel.app')
  })

  it('defaults PROJECTS_API_URL when the variable is present but blank', () => {
    const config = validateConfig({
      PROJECTS_API_URL: '   ',
      PROJECTS_INTERNAL_KEY: 'test-key',
      PROJECTS_ORGANIZATION_ID: 'org_test',
    })

    expect(config.apiUrl).toBe(DEFAULT_PROJECTS_API_URL)
  })

  it('an explicit PROJECTS_API_URL overrides the production default', () => {
    const config = validateConfig({
      PROJECTS_API_URL: 'http://localhost:4030',
      PROJECTS_INTERNAL_KEY: 'test-key',
      PROJECTS_ORGANIZATION_ID: 'org_test',
    })

    expect(config.apiUrl).toBe('http://localhost:4030')
  })

  it('a missing PROJECTS_INTERNAL_KEY fails validation', () => {
    expect(() =>
      validateConfig({
        PROJECTS_API_URL: 'http://localhost:4030',
        PROJECTS_ORGANIZATION_ID: 'org_test',
      })
    ).toThrow(ConfigError)

    try {
      validateConfig({
        PROJECTS_API_URL: 'http://localhost:4030',
        PROJECTS_ORGANIZATION_ID: 'org_test',
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError)
      if (error instanceof ConfigError) {
        expect(error.variable).toBe('PROJECTS_INTERNAL_KEY')
        expect(error.message).toContain('PROJECTS_INTERNAL_KEY')
      }
    }
  })

  it('a missing PROJECTS_ORGANIZATION_ID fails validation', () => {
    expect(() =>
      validateConfig({
        PROJECTS_API_URL: 'http://localhost:4030',
        PROJECTS_INTERNAL_KEY: 'test-key',
      })
    ).toThrow(ConfigError)

    try {
      validateConfig({
        PROJECTS_API_URL: 'http://localhost:4030',
        PROJECTS_INTERNAL_KEY: 'test-key',
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError)
      if (error instanceof ConfigError) {
        expect(error.variable).toBe('PROJECTS_ORGANIZATION_ID')
        expect(error.message).toContain('PROJECTS_ORGANIZATION_ID')
      }
    }
  })

  it('an absent PROJECTS_DEFAULT_USER_ID is accepted', () => {
    const config = validateConfig({
      PROJECTS_API_URL: 'http://localhost:4030',
      PROJECTS_INTERNAL_KEY: 'test-key',
      PROJECTS_ORGANIZATION_ID: 'org_test',
    })
    expect(config.apiUrl).toBe('http://localhost:4030')
    expect(config.internalKey).toBe('test-key')
    expect(config.organizationId).toBe('org_test')
    expect(config.defaultUserId).toBeUndefined()
  })

  it('a present PROJECTS_DEFAULT_USER_ID is trimmed and returned', () => {
    const config = validateConfig({
      PROJECTS_API_URL: 'http://localhost:4030',
      PROJECTS_INTERNAL_KEY: 'test-key',
      PROJECTS_ORGANIZATION_ID: 'org_test',
      PROJECTS_DEFAULT_USER_ID: '  usr_123  ',
    })
    expect(config.defaultUserId).toBe('usr_123')
  })
})
