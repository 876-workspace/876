/** How an accepted quote should become an invoice. */
export type QuoteAcceptedConversion = 'manual' | 'draft-invoice-on-accept'

/** Tenant-owned quote conversion preferences. */
export interface QuotePreference {
  object: 'quote-preference'
  acceptedQuoteConversion: QuoteAcceptedConversion
}

/** Parameters for updating quote conversion preferences. */
export interface QuotePreferenceUpdateParams {
  acceptedQuoteConversion: QuoteAcceptedConversion
}
