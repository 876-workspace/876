import { describe, expect, it } from 'vitest'

import { sampleDocumentFor } from './sample-document'

describe('sampleDocumentFor', () => {
  it('returns realistic Jamaican sample data with display-string money', () => {
    // ARRANGE
    const document = sampleDocumentFor('invoice')

    // ASSERT
    expect(document.seller.address?.city).toBe('Kingston')
    expect(document.seller.address?.country).toBe('Jamaica')
    expect(document.totals.subtotal).toMatch(/^JMD /)
    expect(document.lines[0].rate).toMatch(/^JMD /)
    for (const line of document.lines) {
      expect(typeof line.quantity).toBe('string')
      expect(typeof line.amount).toBe('string')
    }
  })

  it('prefixes the document number per document type', () => {
    expect(sampleDocumentFor('invoice').details.number).toMatch(/^INV-/)
    expect(sampleDocumentFor('quote').details.number).toMatch(/^QT-/)
    expect(sampleDocumentFor('sales-receipt').details.number).toMatch(/^SR-/)
    expect(sampleDocumentFor('credit-note').details.number).toMatch(/^CN-/)
    expect(sampleDocumentFor('payment-receipt').details.number).toMatch(/^PR-/)
  })

  it('uses the provided seller when one is given', () => {
    // ARRANGE
    const seller = sampleDocumentFor('invoice').seller

    // ACT
    const document = sampleDocumentFor('quote', {
      ...seller,
      name: 'Acme Ltd.',
    })

    // ASSERT
    expect(document.seller.name).toBe('Acme Ltd.')
    expect(document.seller.address?.city).toBe('Kingston')
  })

  it('includes notes, terms, payment options and bank details', () => {
    // ARRANGE
    const document = sampleDocumentFor('invoice')

    // ASSERT
    expect(document.notes).toBeTruthy()
    expect(document.terms).toBeTruthy()
    expect(document.paymentOptions.length).toBeGreaterThan(0)
    expect(document.bankDetails.length).toBeGreaterThan(0)
    expect(document.taxSummary.length).toBeGreaterThan(0)
  })

  it('keeps every monetary field a string, never a number', () => {
    // ARRANGE
    const document = sampleDocumentFor('invoice')

    // ASSERT
    for (const value of Object.values(document.totals)) {
      expect(value === null || typeof value === 'string').toBe(true)
    }
  })
})
