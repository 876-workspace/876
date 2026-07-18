import { describe, expect, it } from 'vitest'

import { err, ok } from './result'

describe('Billing service results', () => {
  it('creates a success result without a warning', () => {
    expect(ok({ id: 'item_123' })).toEqual({
      data: { id: 'item_123' },
      error: null,
    })
  })

  it('creates a success result with a warning', () => {
    expect(ok({ id: 'item_123' }, 'Reconciliation pending.')).toEqual({
      data: { id: 'item_123' },
      error: null,
      warning: 'Reconciliation pending.',
    })
  })

  it('creates an error with an explicit status', () => {
    expect(err('Item not found.', 404)).toEqual({
      data: null,
      error: 'Item not found.',
      status: 404,
    })
  })

  it('retains an undefined status when omitted', () => {
    expect(err('Failed.')).toEqual({
      data: null,
      error: 'Failed.',
      status: undefined,
    })
  })
})
