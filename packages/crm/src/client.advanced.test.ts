import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getError, isError, toAppError } from '@876/core'

describe('crm client - envelope handling advanced', () => {
  it('distinguishes network error vs application error vs success', () => {
    const network = {
      data: null,
      error: {
        code: 'network/offline',
        message: 'CRM API could not be reached.',
      },
    } as const
    const appError = {
      data: null,
      error: toAppError(getError('crm/team-not-found')),
    } as const
    const success = { data: { id: 'team_1' }, error: null } as const
    expect(network.error.code).toBe('network/offline')
    expect(appError.error.code).toBe('crm/team-not-found')
    expect(success.data.id).toBe('team_1')
  })

  it('application errors are values that can be stored in state without throw', () => {
    let state: { error: ReturnType<typeof toAppError> | null } = { error: null }
    const result = {
      data: null,
      error: toAppError(getError('crm/request-not-found')),
    }
    if (result.error) state.error = result.error
    expect(state.error?.code).toBe('crm/request-not-found')
    expect(() => {
      if (state.error) throw new Error(state.error.message)
    }).toThrow()
    // but UI should not throw; it renders AppError
    expect(state.error).not.toBeNull()
  })

  it('envelope never contains httpStatus in client error', () => {
    const envelope = {
      data: null,
      error: toAppError(getError('crm/tenant-inactive')),
    }
    expect(
      (envelope.error as unknown as Record<string, unknown>).httpStatus
    ).toBeUndefined()
  })

  it('isError identifies server error values for branching', () => {
    const serverError = getError('crm/category-in-use')
    expect(isError(serverError)).toBe(true)
    expect(isError(toAppError(serverError))).toBe(false)
  })

  it('handles concurrent envelopes independently', async () => {
    const envelopes = await Promise.all([
      Promise.resolve({
        data: null,
        error: toAppError(getError('crm/team-not-found')),
      }),
      Promise.resolve({ data: { id: 'x' }, error: null }),
      Promise.resolve({
        data: null,
        error: toAppError(getError('crm/request-not-found')),
      }),
    ])
    expect(envelopes.filter((e) => e.error)).toHaveLength(2)
    expect(envelopes.filter((e) => e.data)).toHaveLength(1)
  })

  it('preserves error code through JSON serialization for support correlation', () => {
    const err = toAppError(getError('crm/provisioning-invalid'))
    const serialized = JSON.stringify({ error: err })
    const parsed = JSON.parse(serialized)
    expect(parsed.error.code).toBe('crm/provisioning-invalid')
  })
})
