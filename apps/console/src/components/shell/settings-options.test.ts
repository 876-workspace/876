import { describe, expect, it } from 'vitest'

import { CONSOLE_SETTINGS_OPTIONS } from './settings-options'

describe('CONSOLE_SETTINGS_OPTIONS', () => {
  it('contains exactly the 5 top-level console settings options', () => {
    expect(CONSOLE_SETTINGS_OPTIONS).toHaveLength(5)
    expect(CONSOLE_SETTINGS_OPTIONS.map((opt) => opt.key)).toEqual([
      'general',
      'users',
      'security',
      'orgs',
      'notifications',
    ])
  })

  it('has unique keys and unique hrefs for every option', () => {
    const keys = CONSOLE_SETTINGS_OPTIONS.map((opt) => opt.key)
    const hrefs = CONSOLE_SETTINGS_OPTIONS.map((opt) => opt.href)

    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('maps to the correct routes', () => {
    expect(CONSOLE_SETTINGS_OPTIONS.map((opt) => opt.href)).toEqual([
      '/settings/general',
      '/settings/users',
      '/settings/security',
      '/settings/orgs/provisioning',
      '/settings/notifications',
    ])
  })

  it('has valid titles, descriptions, and icon components for all options', () => {
    for (const option of CONSOLE_SETTINGS_OPTIONS) {
      expect(option.title.trim().length).toBeGreaterThan(0)
      expect(option.description.trim().length).toBeGreaterThan(0)
      expect(option.icon).toBeDefined()
      expect(option.iconColor).toContain('text-')
    }
  })
})
