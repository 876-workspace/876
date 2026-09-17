import { describe, expect, it } from 'vitest'

import { isOAuthRedirectUriSafe } from './oauth-redirect-uri'

describe('isOAuthRedirectUriSafe', () => {
  it('accepts HTTPS redirects for public and confidential clients', () => {
    expect(
      isOAuthRedirectUriSafe('https://projects.876.app/oauth/callback', 'public')
    ).toBe(true)
    expect(
      isOAuthRedirectUriSafe(
        'https://projects.876.app/oauth/callback',
        'confidential'
      )
    ).toBe(true)
  })

  it('accepts loopback HTTP and rejects public-host HTTP', () => {
    expect(
      isOAuthRedirectUriSafe('http://127.0.0.1:19006/callback', 'public')
    ).toBe(true)
    expect(
      isOAuthRedirectUriSafe('http://localhost:19006/callback', 'public')
    ).toBe(true)
    expect(
      isOAuthRedirectUriSafe('http://projects.876.app/callback', 'public')
    ).toBe(false)
  })

  it('accepts reverse-domain private-use schemes only for public clients', () => {
    const native = 'com.efestojm.projects://oauth/callback'
    expect(isOAuthRedirectUriSafe(native, 'public')).toBe(true)
    expect(isOAuthRedirectUriSafe(native, 'confidential')).toBe(false)
  })

  it('rejects generic collision-prone custom schemes', () => {
    expect(isOAuthRedirectUriSafe('projects://oauth/callback', 'public')).toBe(
      false
    )
  })

  it('rejects fragments and embedded credentials', () => {
    expect(
      isOAuthRedirectUriSafe(
        'com.efestojm.projects://oauth/callback#token',
        'public'
      )
    ).toBe(false)
    expect(
      isOAuthRedirectUriSafe(
        'https://user:pass@projects.876.app/oauth/callback',
        'public'
      )
    ).toBe(false)
  })

  it('rejects malformed values', () => {
    expect(isOAuthRedirectUriSafe('not a uri', 'public')).toBe(false)
  })
})
