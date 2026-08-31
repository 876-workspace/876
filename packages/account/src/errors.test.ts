import { describe, expect, it } from 'vitest'

import {
  createAuthError,
  createOAuthError,
  createSdkError,
  getInvalidCredentialsMessage,
  mapOAuthErrorCode,
} from './errors.ts'
import { sdkAuthErrorCodeValues } from './errors/auth.ts'

describe('SDK errors', () => {
  it('keeps the auth error codes pinned in alphabetical order', () => {
    expect(sdkAuthErrorCodeValues).toEqual([
      'auth/client-not-configured',
      'auth/invalid-credentials',
      'auth/invalid-input',
      'auth/invalid-response',
      'auth/invalid-token',
      'auth/missing-code',
      'auth/missing-email',
      'auth/missing-first-name',
      'auth/missing-identifier',
      'auth/missing-last-name',
      'auth/missing-organization-name',
      'auth/missing-password',
      'auth/network-error',
      'network/offline',
    ])
  })

  it('creates SDK auth errors from the centralized auth registry', () => {
    expect(createAuthError('auth/missing-organization-name')).toEqual({
      code: 'auth/missing-organization-name',
      message: 'Please enter your organization name.',
    })
  })

  it('allows auth error message overrides without changing the registry', () => {
    expect(
      createAuthError('auth/invalid-credentials', {
        message: getInvalidCredentialsMessage('someuser'),
      })
    ).toEqual({
      code: 'auth/invalid-credentials',
      message: 'The username or password you entered is incorrect.',
    })
  })

  it('creates SDK OAuth errors from the centralized OAuth registry', () => {
    expect(createOAuthError('oauth/invalid-grant')).toEqual({
      code: 'oauth/invalid-grant',
      message: 'The authorization grant is invalid.',
    })
  })

  it('maps provider OAuth error strings to SDK OAuth codes', () => {
    expect(mapOAuthErrorCode('access_denied')).toBe('oauth/access-denied')
    expect(mapOAuthErrorCode('unknown_error')).toBe('oauth/invalid-input')
  })

  it('creates errors through the combined SDK registry', () => {
    expect(createSdkError('network/offline')).toEqual({
      code: 'network/offline',
      message: 'No internet connection. Check your connection and try again.',
    })
  })
})
