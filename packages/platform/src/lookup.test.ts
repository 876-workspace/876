import { describe, expect, it } from 'vitest'

import {
  AdminLookupError,
  isNotFoundError,
  unwrapOptional,
  unwrapResult,
} from './lookup'
import type { AdminResult } from './types'

describe('admin lookup helpers', () => {
  it('treats only domain not-found errors as definitive negatives', () => {
    expect(
      isNotFoundError({ code: 'user/not-found', message: 'No user' })
    ).toBe(true)
    expect(
      isNotFoundError({
        code: 'admin/network-error',
        message: 'Network failed',
      })
    ).toBe(false)
    expect(
      isNotFoundError({
        code: 'auth/session-not-found',
        message: 'Session missing',
      })
    ).toBe(false)
    expect(isNotFoundError(null)).toBe(false)
  })

  it('unwraps optional lookups while preserving indeterminate failures', () => {
    expect(
      unwrapOptional({ data: { id: 'user_1' }, error: null }, 'user')
    ).toEqual({ id: 'user_1' })
    expect(
      unwrapOptional(
        { data: null, error: { code: 'user/not-found', message: 'No user' } },
        'user'
      )
    ).toBeNull()

    const failure = captureLookupError(() =>
      unwrapOptional(
        {
          data: null,
          error: { code: 'admin/network-error', message: 'Network failed' },
        },
        'user'
      )
    )

    expect(failure).toBeInstanceOf(AdminLookupError)
    expect(failure).toMatchObject({
      name: 'AdminLookupError',
      code: 'admin/network-error',
      message: 'Failed to resolve user: Network failed (admin/network-error)',
    })
  })

  it('requires list-style lookups to succeed instead of treating errors as empty', () => {
    const success: AdminResult<{ data: string[] }> = {
      data: { data: [] },
      error: null,
    }
    const failure: AdminResult<{ data: string[] }> = {
      data: null,
      error: { code: 'membership/not-found', message: 'No memberships' },
    }

    expect(unwrapResult(success, 'memberships')).toEqual({ data: [] })
    const error = captureLookupError(() => unwrapResult(failure, 'memberships'))

    expect(error).toBeInstanceOf(AdminLookupError)
    expect(error).toMatchObject({
      name: 'AdminLookupError',
      code: 'membership/not-found',
      message:
        'Failed to resolve memberships: No memberships (membership/not-found)',
    })
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
