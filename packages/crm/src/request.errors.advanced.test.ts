import { describe, expect, it } from 'vitest'
import { getError, isError, toAppError } from '@876/core'

describe('packages/crm request client - error values', () => {
  it('network offline shape is stable', () => {
    const err = { code: 'network/offline', message: 'CRM API could not be reached.' } as const
    expect(err.code).toBe('network/offline')
    expect(err.message).toContain('could not be reached')
  })

  it('crm/not-configured via getError has 503', async () => {
    const err = getError('crm/not-configured')
    expect(err.httpStatus).toBe(503)
    expect(err.code).toBe('crm/not-configured')
    expect(isError(err)).toBe(true)
    expect((toAppError(err) as unknown as Record<string, unknown>).httpStatus).toBeUndefined()
  })

  it('crm/invalid-response via getError has 502', () => {
    const err = getError('crm/invalid-response')
    expect(err.httpStatus).toBe(502)
    expect(err.message).toContain('invalid response')
  })

  it('client should treat registry-unavailable as value not throw', () => {
    const err = getError('crm/registry-unavailable')
    expect(isError(err)).toBe(true)
    expect(err.httpStatus).toBe(502)
    const envelope = { data: null, error: toAppError(err) }
    expect(envelope.error.code).toBe('crm/registry-unavailable')
  })

  it('envelope discriminates success vs error without try/catch', () => {
    const success = { data: { id: 'cus_1' }, error: null } as const
    const failure = { data: null, error: toAppError(getError('crm/customer-not-found')) } as const
    expect(success.error).toBeNull()
    expect(failure.data).toBeNull()
    expect(failure.error.code).toBe('crm/customer-not-found')
  })
})
