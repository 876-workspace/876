import { describe, expect, it } from 'vitest'

import {
  calculateDocumentLineTotal,
  calculateDocumentTotals,
  emptyDocumentLine,
  prepareDocumentLine,
} from './document-create-model'

describe('document create model', () => {
  it('converts a percentage discount into an exact minor-unit snapshot', () => {
    const line = {
      ...emptyDocumentLine('line-1'),
      description: 'Consulting',
      quantity: '2',
      unitAmount: '1250.00',
      discountType: 'PERCENTAGE' as const,
      discountValue: '10',
      taxAmount: '337.50',
    }

    expect(prepareDocumentLine(line, 2)).toEqual({
      description: 'Consulting',
      quantity: 2,
      unitAmount: '125000',
      discountAmount: '25000',
      taxAmount: '33750',
    })
  })

  it('respects zero-decimal currencies instead of assuming cents', () => {
    const line = {
      ...emptyDocumentLine('line-1'),
      description: 'License',
      unitAmount: '5000',
      discountValue: '500',
    }

    expect(prepareDocumentLine(line, 0)).toMatchObject({
      unitAmount: '5000',
      discountAmount: '500',
      taxAmount: '0',
    })
  })

  it('rejects discounts above the line subtotal', () => {
    const line = {
      ...emptyDocumentLine('line-1'),
      description: 'License',
      unitAmount: '100.00',
      discountValue: '101.00',
    }

    expect(prepareDocumentLine(line, 2)).toBeNull()
  })

  it('calculates the live line and document totals', () => {
    const line = {
      ...emptyDocumentLine('line-1'),
      description: 'Support',
      quantity: '2',
      unitAmount: '100',
      discountType: 'PERCENTAGE' as const,
      discountValue: '25',
      taxAmount: '10',
    }

    expect(calculateDocumentLineTotal(line)).toBe(160)
    expect(calculateDocumentTotals([line])).toEqual({
      subtotal: 200,
      discount: 50,
      tax: 10,
      total: 160,
    })
  })
})
