import { describe, expect, it } from 'vitest'

import {
  ResourceLookupError,
  isNotFoundError,
  unwrapOptional,
  unwrapResult,
} from './lookup'
import type { LookupResult } from './lookup'

describe('lookup result helpers', () => {
  it('treats only resource not-found errors as definitive negatives', () => {
    expect(
      isNotFoundError({ code: 'user/not-found', message: 'No user' })
    ).toBe(true)
    expect(
      isNotFoundError({
        code: 'auth/session-not-found',
        message: 'Session missing',
      })
    ).toBe(false)
    expect(
      isNotFoundError({
        code: 'provider/code-not-found',
        message: 'Invalid authorization code',
      })
    ).toBe(false)
    expect(isNotFoundError(null)).toBe(false)
  })

  it('unwraps optional lookups and throws indeterminate failures with context', () => {
    expect(
      unwrapOptional({ data: { id: 'user_1' }, error: null }, 'user')
    ).toEqual({ id: 'user_1' })
    expect(
      unwrapOptional(
        { data: null, error: { code: 'user/not-found', message: 'No user' } },
        'user'
      )
    ).toBeNull()

    const error = captureLookupError(() =>
      unwrapOptional(
        {
          data: null,
          error: { code: 'admin/network-error', message: 'Network failed' },
        },
        'user'
      )
    )

    expect(error).toBeInstanceOf(ResourceLookupError)
    expect(error).toMatchObject({
      code: 'admin/network-error',
      message: 'Failed to resolve user: Network failed (admin/network-error)',
    })
  })

  it('requires list-style lookups to succeed', () => {
    const success: LookupResult<{ data: string[] }> = {
      data: { data: [] },
      error: null,
    }
    const failure: LookupResult<{ data: string[] }> = {
      data: null,
      error: { code: 'membership/not-found', message: 'No memberships' },
    }

    expect(unwrapResult(success, 'memberships')).toEqual({ data: [] })
    expect(
      captureLookupError(() => unwrapResult(failure, 'memberships'))
    ).toBeInstanceOf(ResourceLookupError)
  })
})

function captureLookupError(action: () => unknown): Error {
  try {
    action()
  } catch (error) {
    if (error instanceof Error) return error
  }

  throw new Error('Expected lookup to throw')
}
