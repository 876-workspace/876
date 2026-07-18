import { describe, expect, it } from 'vitest'

import { InvoicePreferenceUpdateSchema } from './invoice-preference'

function validPreference(overrides: Record<string, unknown> = {}) {
  return {
    defaultTaxBehavior: 'EXCLUSIVE',
    defaultNotes: null,
    defaultTerms: null,
    allowEditingSentInvoices: false,
    lateFeesEnabled: false,
    lateFeeCalculationType: 'PERCENTAGE',
    lateFeePercent: null,
    lateFeeAmount: null,
    lateFeeGraceDays: 0,
    lateFeeGenerateAsDraft: true,
    ...overrides,
  }
}

describe('InvoicePreferenceUpdateSchema', () => {
  it('accepts disabled late fees without a configured amount', () => {
    const result = InvoicePreferenceUpdateSchema.safeParse(validPreference())

    expect(result).toEqual({
      success: true,
      data: validPreference(),
    })
  })

  it.each([
    [
      'percentage',
      { lateFeesEnabled: true, lateFeePercent: 0 },
      'Enter a late-fee percentage greater than zero.',
    ],
    [
      'fixed amount',
      {
        lateFeesEnabled: true,
        lateFeeCalculationType: 'FIXED',
        lateFeeAmount: 0,
      },
      'Enter a fixed late-fee amount greater than zero.',
    ],
  ])(
    'rejects an enabled late fee without a positive %s',
    (_name, overrides, message) => {
      const result = InvoicePreferenceUpdateSchema.safeParse(
        validPreference(overrides)
      )

      expect(result.success).toBe(false)
      if (result.success) return
      expect(result.error.issues).toEqual([
        expect.objectContaining({ code: 'custom', message }),
      ])
    }
  )

  it('rejects unknown preference fields', () => {
    const result = InvoicePreferenceUpdateSchema.safeParse(
      validPreference({ copiedVendorSetting: true })
    )

    expect(result.success).toBe(false)
  })
})
