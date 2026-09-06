import { describe, expect, it } from 'vitest'

import {
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
      discountAmount: '10',
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
      discountAmount: '500',
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
      discountAmount: '101.00',
    }

    expect(prepareDocumentLine(line, 2)).toBeNull()
  })

  it('uses the server-resolved subtotal for a price-list percentage discount', () => {
    const line = {
      ...emptyDocumentLine('line-1'),
      description: 'Support',
      quantity: '2',
      priceId: 'price_support',
      resolvedSubtotal: '175.00',
      discountType: 'PERCENTAGE' as const,
      discountAmount: '25',
      taxAmount: '10.00',
    }

    expect(prepareDocumentLine(line, 2, true)).toEqual({
      priceId: 'price_support',
      description: 'Support',
      quantity: 2,
      discountAmount: '4375',
      taxAmount: '1000',
    })
  })
})
