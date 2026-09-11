import { describe, expect, it } from 'vitest'

import { prepareDocumentLine } from './document-line-payload'
import type { DocumentLineDraft } from './document-line-items-editor'

function line(overrides: Partial<DocumentLineDraft> = {}): DocumentLineDraft {
  return {
    id: 'line-1',
    description: 'Consulting',
    quantity: '1',
    unitAmount: '100.00',
    discountType: 'AMOUNT',
    discountAmount: '0',
    taxAmount: '0',
    ...overrides,
  }
}

describe('prepareDocumentLine', () => {
  it('converts a percentage discount into an exact minor-unit snapshot', () => {
    expect(
      prepareDocumentLine(
        line({
          quantity: '2',
          unitAmount: '1250.00',
          discountType: 'PERCENTAGE',
          discountAmount: '10',
          taxAmount: '337.50',
        }),
        2
      )
    ).toEqual({
      description: 'Consulting',
      quantity: 2,
      unitAmount: '125000',
      discountAmount: '25000',
      taxAmount: '33750',
    })
  })

  it('respects zero-decimal currencies instead of assuming cents', () => {
    expect(
      prepareDocumentLine(
        line({
          description: 'License',
          unitAmount: '5000',
          discountAmount: '500',
        }),
        0
      )
    ).toMatchObject({
      unitAmount: '5000',
      discountAmount: '500',
      taxAmount: '0',
    })
  })

  it('rejects discounts above the line subtotal', () => {
    expect(
      prepareDocumentLine(
        line({
          description: 'License',
          unitAmount: '100.00',
          discountAmount: '101.00',
        }),
        2
      )
    ).toBeNull()
  })

  it('uses the server-resolved subtotal for a price-list percentage discount', () => {
    expect(
      prepareDocumentLine(
        line({
          description: 'Support',
          quantity: '2',
          priceId: 'price_support',
          resolvedSubtotal: '175.00',
          discountType: 'PERCENTAGE',
          discountAmount: '25',
          taxAmount: '10.00',
        }),
        2,
        true
      )
    ).toEqual({
      priceId: 'price_support',
      description: 'Support',
      quantity: 2,
      discountAmount: '4375',
      taxAmount: '1000',
    })
  })
})

describe('SalesReceiptCreateForm line payload', () => {
  it('resolves a percentage discount against the line subtotal', () => {
    expect(
      prepareDocumentLine(
        line({
          quantity: '3',
          unitAmount: '20.00',
          discountType: 'PERCENTAGE',
          discountAmount: '12.50',
        }),
        2
      )
    ).toMatchObject({ discountAmount: '750' })
  })

  it('rejects a discount above the line subtotal', () => {
    expect(
      prepareDocumentLine(
        line({ unitAmount: '10.00', discountAmount: '10.01' }),
        2
      )
    ).toBeNull()
  })

  it('rejects a percentage discount above 100 percent', () => {
    expect(
      prepareDocumentLine(
        line({ discountType: 'PERCENTAGE', discountAmount: '100.01' }),
        2
      )
    ).toBeNull()
  })

  it('carries the selected variant id through', () => {
    expect(
      prepareDocumentLine(line({ itemId: 'item_1', variantId: 'variant_1' }), 2)
    ).toMatchObject({ itemId: 'item_1', variantId: 'variant_1' })
  })

  it('accepts grouped amount input through the core-backed parser', () => {
    expect(
      prepareDocumentLine(line({ unitAmount: '1,000.50' }), 2)
    ).toMatchObject({
      unitAmount: '100050',
    })
  })
})
