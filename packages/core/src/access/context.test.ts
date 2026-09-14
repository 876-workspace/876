import { describe, expect, it } from 'vitest'

import {
  can,
  hasFeature,
  hasModule,
  variantOf,
  type AccessContext,
} from './context'

function context(overrides: Partial<AccessContext> = {}): AccessContext {
  return {
    subject: { userId: 'user_695d45c54a374ff0a570003e15668891' },
    modules: ['projects', 'issues'],
    permissions: ['users:read', 'organizations:list'],
    features: ['console_search_bar', 'console_widgets'],
    experiments: { console_nav_density: 'compact' },
    ...overrides,
  }
}

describe('hasModule', () => {
  it('returns true for an exact effective module', () => {
    const result = hasModule(context(), 'projects')

    expect(result).toBe(true)
  })

  it('returns false for a module that is not effective', () => {
    const result = hasModule(context(), 'reports')

    expect(result).toBe(false)
  })

  it('fails closed when modules are absent or malformed at runtime', () => {
    const missing = context() as unknown as Record<string, unknown>
    delete missing.modules
    const malformed = {
      ...context(),
      modules: 'projects',
    } as unknown as AccessContext

    expect(hasModule(missing as unknown as AccessContext, 'projects')).toBe(false)
    expect(hasModule(malformed, 'projects')).toBe(false)
    expect(hasModule(null as unknown as AccessContext, 'projects')).toBe(false)
  })

  it('rejects an empty module key and ignores malformed array entries', () => {
    const malformed = context({
      modules: ['projects', 42, null] as unknown as string[],
    })

    expect(hasModule(malformed, 'projects')).toBe(true)
    expect(hasModule(malformed, '')).toBe(false)
  })
})

describe('can', () => {
  it('returns true for an exact held permission', () => {
    const result = can(context(), 'users:read')

    expect(result).toBe(true)
  })

  it('returns false for a permission that is not held', () => {
    const result = can(context(), 'users:update')

    expect(result).toBe(false)
  })

  it('returns false for an empty permission set', () => {
    const result = can(context({ permissions: [] }), 'users:read')

    expect(result).toBe(false)
  })

  it('returns false when permissions are undefined at runtime', () => {
    const malformed = context({ permissions: [] }) as unknown as {
      subject: AccessContext['subject']
      features: readonly string[]
      experiments: Readonly<Record<string, string>>
    }

    const result = can(malformed as unknown as AccessContext, 'users:read')

    expect(result).toBe(false)
  })

  it('returns false when permissions are not an array at runtime', () => {
    const malformed = {
      ...context(),
      permissions: 'users:read',
    } as unknown as AccessContext

    const result = can(malformed, 'users:read')

    expect(result).toBe(false)
  })

  it('returns false for an empty permission key', () => {
    const result = can(context({ permissions: [''] }), '')

    expect(result).toBe(false)
  })

  it('does not match a permission that is only a prefix of a held key', () => {
    const result = can(
      context({ permissions: ['users:reading'] }),
      'users:read'
    )

    expect(result).toBe(false)
  })

  it('ignores non-string values in a malformed permission array', () => {
    const malformed = context({
      permissions: ['users:read', 42, null] as unknown as string[],
    })

    const result = can(malformed, 'users:read')

    expect(result).toBe(true)
  })

  it('returns false for a null context at runtime', () => {
    const result = can(null as unknown as AccessContext, 'users:read')

    expect(result).toBe(false)
  })
})

describe('hasFeature', () => {
  it('returns true for an exact enabled feature', () => {
    const result = hasFeature(context(), 'console_search_bar')

    expect(result).toBe(true)
  })

  it('returns false for a feature that is not enabled', () => {
    const result = hasFeature(context(), 'console_reports')

    expect(result).toBe(false)
  })

  it('returns false for an empty feature set', () => {
    const result = hasFeature(context({ features: [] }), 'console_search_bar')

    expect(result).toBe(false)
  })

  it('returns false when features are undefined at runtime', () => {
    const malformed = context() as unknown as Record<string, unknown>
    delete malformed.features

    const result = hasFeature(
      malformed as unknown as AccessContext,
      'console_search_bar'
    )

    expect(result).toBe(false)
  })

  it('returns false when features are not an array at runtime', () => {
    const malformed = {
      ...context(),
      features: 'console_search_bar',
    } as unknown as AccessContext

    const result = hasFeature(malformed, 'console_search_bar')

    expect(result).toBe(false)
  })

  it('returns false for an empty feature key', () => {
    const result = hasFeature(context({ features: [''] }), '')

    expect(result).toBe(false)
  })

  it('does not match a feature that is only a prefix of an enabled key', () => {
    const result = hasFeature(
      context({ features: ['console_search_bar_v2'] }),
      'console_search_bar'
    )

    expect(result).toBe(false)
  })

  it('ignores non-string values in a malformed feature array', () => {
    const malformed = context({
      features: ['console_search_bar', false] as unknown as string[],
    })

    const result = hasFeature(malformed, 'console_search_bar')

    expect(result).toBe(true)
  })
})

describe('variantOf', () => {
  it('returns the assigned experiment variant', () => {
    const result = variantOf(context(), 'console_nav_density')

    expect(result).toBe('compact')
  })

  it('returns null for an unassigned experiment', () => {
    const result = variantOf(context(), 'console_sidebar_order')

    expect(result).toBeNull()
  })

  it('returns null for an empty experiment map', () => {
    const result = variantOf(
      context({ experiments: {} }),
      'console_nav_density'
    )

    expect(result).toBeNull()
  })

  it('returns null for a non-string runtime variant value', () => {
    const malformed = context({
      experiments: { console_nav_density: 2 } as unknown as Record<
        string,
        string
      >,
    })

    const result = variantOf(malformed, 'console_nav_density')

    expect(result).toBeNull()
  })

  it('returns null when experiments are undefined at runtime', () => {
    const malformed = context() as unknown as Record<string, unknown>
    delete malformed.experiments

    const result = variantOf(
      malformed as unknown as AccessContext,
      'console_nav_density'
    )

    expect(result).toBeNull()
  })

  it('returns null when experiments are an array at runtime', () => {
    const malformed = {
      ...context(),
      experiments: ['compact'],
    } as unknown as AccessContext

    const result = variantOf(malformed, 'console_nav_density')

    expect(result).toBeNull()
  })

  it('returns null for an empty experiment key', () => {
    const result = variantOf(context({ experiments: { '': 'compact' } }), '')

    expect(result).toBeNull()
  })

  it('returns null for a null context at runtime', () => {
    const result = variantOf(
      null as unknown as AccessContext,
      'console_nav_density'
    )

    expect(result).toBeNull()
  })
})
