import { z } from 'zod'

import { IdSchema, unixTimestampSchema } from './common'
import { SubscriptionStatusSchema } from './subscription'

export const SubscriptionEnsureSchema = z.strictObject({
  externalReference: IdSchema,
  sourceAppId: IdSchema.nullable().optional(),
  customerId: IdSchema,
  items: z
    .array(
      z.strictObject({
        priceEntitlementReferenceId: IdSchema,
        quantity: z.number().int().min(1).max(1_000_000).default(1),
      })
    )
    .min(1)
    .max(100),
  status: SubscriptionStatusSchema.default('ACTIVE'),
  startAt: unixTimestampSchema.optional(),
  cancelAtPeriodEnd: z.boolean().default(false),
})

export type SubscriptionEnsureParams = z.infer<typeof SubscriptionEnsureSchema>
