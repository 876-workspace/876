import { z } from 'zod'

import type { QuotePreference } from './quote-preference'

export const QuoteAcceptedConversionSchema = z.enum([
  'manual',
  'draft-invoice-on-accept',
])

export const QuotePreferenceSchema = z.strictObject({
  object: z.literal('quote-preference'),
  acceptedQuoteConversion: QuoteAcceptedConversionSchema,
}) satisfies z.ZodType<QuotePreference>
