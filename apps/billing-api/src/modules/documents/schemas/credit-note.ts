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

export const CreditNoteStatusSchema = z.enum([
  'DRAFT',
  'OPEN',
  'CLOSED',
  'VOID',
])

/** A single credit-note line; its total is computed by the service. */
export const CreditNoteLineSchema = z.strictObject({
  itemId: IdSchema.nullable().optional(),
  priceId: IdSchema.nullable().optional(),
  description: z.string().trim().min(1).max(500),
  quantity: z.number().int().min(1).max(1_000_000).default(1),
  unitAmount: positiveMinorAmountSchema,
  taxAmount: minorAmountSchema.optional(),
  discountAmount: minorAmountSchema.optional(),
})

export const CreditNoteCreateSchema = z.strictObject({
  customerId: IdSchema,
  currency: currencyCodeSchema,
  invoiceId: IdSchema.nullable().optional(),
  reason: optionalShortTextSchema,
  notes: optionalTextSchema,
  terms: optionalTextSchema,
  issueAt: unixTimestampSchema.optional(),
  lines: z.array(CreditNoteLineSchema).min(1).max(200),
})

export type CreditNoteCreateParams = z.infer<typeof CreditNoteCreateSchema>
export type CreditNoteCreateInput = z.input<typeof CreditNoteCreateSchema>

/** One credit-note-to-invoice application. */
export const CreditNoteAllocationSchema = z.strictObject({
  invoiceId: IdSchema,
  amount: positiveMinorAmountSchema,
})

export const CreditNoteApplySchema = z
  .strictObject({
    allocations: z.array(CreditNoteAllocationSchema).min(1).max(100),
  })
  .superRefine((value, context) => {
    const invoiceIds = new Set<string>()
    for (const [index, allocation] of value.allocations.entries()) {
      if (invoiceIds.has(allocation.invoiceId))
        context.addIssue({
          code: 'custom',
          message: 'Each invoice can be applied only once.',
          path: ['allocations', index, 'invoiceId'],
        })
      invoiceIds.add(allocation.invoiceId)
    }
  })

export type CreditNoteApplyParams = z.infer<typeof CreditNoteApplySchema>
export type CreditNoteApplyInput = z.input<typeof CreditNoteApplySchema>

export interface CreditNoteCreated {
  object: 'credit_note'
  id: string
}
