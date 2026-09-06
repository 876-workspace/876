import { z } from 'zod'

import type { BillingQuote, BillingQuoteList } from './quote'

export const BillingQuoteSchema = z
  .strictObject({ object: z.literal('quote'), id: z.string().min(1) })
  .passthrough() satisfies z.ZodType<BillingQuote>

export const BillingQuoteListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(BillingQuoteSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
}) satisfies z.ZodType<BillingQuoteList>
