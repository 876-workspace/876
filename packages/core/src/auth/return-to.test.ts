import { describe, expect, it } from 'vitest'

import {
  createAuthLoginPath,
  createReturnToPath,
  resolveRelativeReturnTo,
} from './return-to'

describe('auth return-to helpers', () => {
  it('builds the standard embedded login path', () => {
    expect(createAuthLoginPath('/customers?status=active')).toBe(
      '/login?returnTo=%2Fcustomers%3Fstatus%3Dactive'
    )
  })

  it.each([
    ['an absolute off-site URL', 'https://evil.example.com/steal'],
    ['a protocol-relative URL', '//evil.example.com'],
    ['a backslash-escaped path', '/\\evil.example.com'],
    ['the login page itself', '/login'],
    ['a login page with a query', '/login?returnTo=%2Fusers'],
    ['an empty destination', ''],
  ])('falls back to / when the login destination is %s', (_name, returnTo) => {
    expect(createAuthLoginPath(returnTo)).toBe('/login?returnTo=%2F')
  })

  it('resolves safe relative return paths', () => {
    expect(resolveRelativeReturnTo('/settings')).toBe('/settings')
    expect(createReturnToPath('/settings', '?tab=profile')).toBe(
      '/settings?tab=profile'
    )
  })

  it.each(['https://example.com', '//example.com', '/login'])(
    'falls back for unsafe or blocked return path %s',
    (value) => {
      expect(resolveRelativeReturnTo(value)).toBe('/')
    }
  )
})
