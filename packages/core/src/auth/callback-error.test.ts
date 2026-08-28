import { describe, expect, it } from 'vitest'

import {
  AUTH_CALLBACK_ERROR_CODES,
  AUTH_CALLBACK_ERROR_PARAM,
  isAuthCallbackErrorCode,
  resolveAuthCallbackMessage,
} from './callback-error'

describe('resolveAuthCallbackMessage', () => {
  it('names the parameter the callback routes already write', () => {
    expect(AUTH_CALLBACK_ERROR_PARAM).toBe('authError')
  })

  it.each([
    ['auth/oauth-cancelled', 'Sign-in was cancelled. Please try again.'],
    [
      'auth/oauth-failed',
      'We could not complete sign-in with that provider. Please try again.',
    ],
    [
      'auth/missing-code',
      'Your sign-in link has expired or was already used. Please try again.',
    ],
  ])('renders a sign-in message for %s', (code, message) => {
    expect(resolveAuthCallbackMessage(code)).toBe(message)
  })

  it('gives every known code a message', () => {
    for (const code of AUTH_CALLBACK_ERROR_CODES) {
      expect(resolveAuthCallbackMessage(code)).toMatch(/\.$/)
    }
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['whitespace', '   '],
  ])('returns null for %s so no banner renders', (_name, value) => {
    expect(resolveAuthCallbackMessage(value)).toBeNull()
  })

  it('reads the first value when the parameter repeats', () => {
    expect(resolveAuthCallbackMessage(['auth/oauth-cancelled', 'auth/x'])).toBe(
      'Sign-in was cancelled. Please try again.'
    )
  })

  it('does not echo an unrecognized code back into the page', () => {
    expect(resolveAuthCallbackMessage('<script>alert(1)</script>')).toBe(
      'We could not complete sign-in. Please try again.'
    )
  })

  it('does not echo an unknown auth-namespaced code', () => {
    expect(resolveAuthCallbackMessage('auth/not-a-real-code')).toBe(
      'We could not complete sign-in. Please try again.'
    )
  })
})

describe('isAuthCallbackErrorCode', () => {
  it('accepts every declared code', () => {
    for (const code of AUTH_CALLBACK_ERROR_CODES) {
      expect(isAuthCallbackErrorCode(code)).toBe(true)
    }
  })

  it('rejects an unrelated auth code', () => {
    expect(isAuthCallbackErrorCode('auth/invalid-credentials')).toBe(false)
  })
})
