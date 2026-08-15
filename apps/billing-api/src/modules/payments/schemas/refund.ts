import { z } from 'zod'

import {
  IdSchema,
  optionalShortTextSchema,
  optionalTextSchema,
  unixTimestampSchema,
} from './common'
import { currencyCodeSchema, minorAmountSchema } from './currency'

const positiveMinorAmountSchema = minorAmountSchema.refine(
  (amount) => amount > 0n,
  'Enter an amount greater than zero.'
)

export const RefundCreateSchema = z
  .strictObject({
    customerId: IdSchema,
    currency: currencyCodeSchema,
    amount: positiveMinorAmountSchema,
    creditNoteId: IdSchema.optional(),
    paymentId: IdSchema.optional(),
    paymentModeId: IdSchema.nullable().optional(),
    depositAccountId: IdSchema.nullable().optional(),
    reason: optionalShortTextSchema,
    notes: optionalTextSchema,
    refundedAt: unixTimestampSchema,
  })
  .superRefine((value, context) => {
    const hasCreditNote = value.creditNoteId !== undefined
    const hasPayment = value.paymentId !== undefined

    if (hasCreditNote === hasPayment)
      context.addIssue({
        code: 'custom',
        message: 'Provide exactly one refund source.',
        path: ['creditNoteId'],
      })
  })

export type RefundCreateParams = z.infer<typeof RefundCreateSchema>
export type RefundCreateInput = z.input<typeof RefundCreateSchema>

export interface RefundCreated {
  object: 'refund'
  id: string
}
