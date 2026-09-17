import { beforeAll, describe, expect, it, vi } from 'vitest'

import type * as Config from './config'

let config: typeof Config

beforeAll(async () => {
  vi.stubEnv('EXPO_PUBLIC_OAUTH_CLIENT_ID', 'native-client-id')
  vi.stubEnv(
    'EXPO_PUBLIC_876_AUTHORIZE_URL',
    'https://enterprise.876.app/api/oauth/native-authorize'
  )
  config = await import('./config')
})

describe('buildNativeAuthorizeUrl', () => {
  it('builds a PKCE authorize URL against the first-party proxy', () => {
    const url = new URL(
      config.buildNativeAuthorizeUrl({
        codeChallenge: 'challenge',
        codeChallengeMethod: 'S256',
        state: 'state-value',
        organizationId: 'org_1',
      })
    )
    expect(url.origin).toBe('https://enterprise.876.app')
    expect(url.searchParams.get('client_id')).toBe('native-client-id')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'com.efesto.projects://oauth/callback'
    )
    expect(url.searchParams.get('code_challenge')).toBe('challenge')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('state')).toBe('state-value')
    expect(url.searchParams.get('org_id')).toBe('org_1')
  })
})

describe('parseNativeCallback', () => {
  it('reads code and state from the native callback', () => {
    expect(
      config.parseNativeCallback(
        'com.efesto.projects://oauth/callback?code=abc&state=s'
      )
    ).toEqual({ code: 'abc', state: 's', error: null })
  })

  it('surfaces provider errors', () => {
    expect(
      config.parseNativeCallback(
        'com.efesto.projects://oauth/callback?error=access_denied'
      )
    ).toEqual({ code: null, state: null, error: 'access_denied' })
  })
})
