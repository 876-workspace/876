import { describe, expect, it } from 'vitest'

import { SETTINGS_OPTIONS } from './settings-options'

describe('SETTINGS_OPTIONS', () => {
  it('contains exactly the 5 top-level console settings options', () => {
    expect(SETTINGS_OPTIONS).toHaveLength(5)
    expect(SETTINGS_OPTIONS.map((opt) => opt.key)).toEqual([
      'general',
      'users',
      'security',
      'orgs',
      'notifications',
    ])
  })

  it('has unique keys and unique hrefs for every option', () => {
    const keys = SETTINGS_OPTIONS.map((opt) => opt.key)
    const hrefs = SETTINGS_OPTIONS.map((opt) => opt.href)

    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('maps to the correct routes', () => {
    expect(SETTINGS_OPTIONS.map((opt) => opt.href)).toEqual([
      '/settings/general',
      '/settings/users',
      '/settings/security',
      '/settings/orgs/provisioning',
      '/settings/notifications',
    ])
  })

  it('has valid titles, descriptions, and icon components for all options', () => {
    for (const option of SETTINGS_OPTIONS) {
      expect(option.title.trim().length).toBeGreaterThan(0)
      expect(option.description.trim().length).toBeGreaterThan(0)
      expect(option.icon).toBeDefined()
      expect(option.iconColor).toContain('text-')
    }
  })
})
