import { z } from 'zod'

export const QuoteAcceptedConversionSchema = z.enum([
  'manual',
  'draft-invoice-on-accept',
])

export type QuoteAcceptedConversion = z.infer<
  typeof QuoteAcceptedConversionSchema
>

export const QuotePreferenceUpdateSchema = z.strictObject({
  acceptedQuoteConversion: QuoteAcceptedConversionSchema,
})

export type QuotePreferenceUpdateParams = z.infer<
  typeof QuotePreferenceUpdateSchema
>

export interface QuotePreferenceResource {
  object: 'quote-preference'
  acceptedQuoteConversion: QuoteAcceptedConversion
}
