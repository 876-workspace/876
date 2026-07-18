import { z } from 'zod'

import { IdSchema } from './common'
import { minorAmountSchema } from './currency'

export const DocumentLineCreateSchema = z.strictObject({
  itemId: IdSchema.nullable().optional(),
  priceId: IdSchema.nullable().optional(),
  description: z.string().trim().min(1).max(2000).nullable().optional(),
  quantity: z.number().int().min(1).max(1_000_000).default(1),
  unitAmount: minorAmountSchema.nullable().optional(),
  taxAmount: minorAmountSchema.optional(),
  discountAmount: minorAmountSchema.optional(),
})

export type DocumentLineCreateParams = z.infer<typeof DocumentLineCreateSchema>
