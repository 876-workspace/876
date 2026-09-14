import { describe, expect, it } from 'vitest'

import { salesOrderActionsForStatus } from './sales-order-actions'

describe('salesOrderActionsForStatus', () => {
  it('offers draft actions', () => {
    expect(salesOrderActionsForStatus('draft')).toEqual([
      'edit',
      'confirm',
      'cancel',
    ])
  })

  it('offers confirmed actions', () => {
    expect(salesOrderActionsForStatus('confirmed')).toEqual([
      'cancel',
      'complete',
      'convertToInvoice',
    ])
  })

  it('offers no completed actions', () => {
    expect(salesOrderActionsForStatus('completed')).toEqual([])
  })

  it('offers no canceled actions', () => {
    expect(salesOrderActionsForStatus('canceled')).toEqual([])
  })

  it('offers no actions for an unrecognized status', () => {
    expect(salesOrderActionsForStatus('pending')).toEqual([])
  })
})
