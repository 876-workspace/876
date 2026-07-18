import { describe, expect, it } from 'vitest'

import { err, errFrom, ok } from './result'

describe('service results', () => {
  it('creates a success result without a warning', () => {
    expect(ok({ id: 'user_123' })).toEqual({
      data: { id: 'user_123' },
      error: null,
    })
  })

  it('creates a success result with a warning', () => {
    expect(ok({ id: 'user_123' }, 'Partial synchronization.')).toEqual({
      data: { id: 'user_123' },
      error: null,
      warning: 'Partial synchronization.',
    })
  })

  it('creates an error result with an explicit status', () => {
    expect(err('Not found.', 404)).toEqual({
      data: null,
      error: 'Not found.',
      status: 404,
    })
  })

  it('keeps the status key undefined when no status is provided', () => {
    expect(err('Failed.')).toEqual({
      data: null,
      error: 'Failed.',
      status: undefined,
    })
  })

  it('creates an error from the canonical registry definition', () => {
    expect(errFrom('role/not-found')).toEqual({
      data: null,
      error: 'The requested role was not found.',
      status: 404,
      code: 'role/not-found',
    })
  })
})
