import { z } from 'zod'

import { DocumentLineCreateSchema } from './document-line'
import { IdSchema, optionalTextSchema, unixTimestampSchema } from './common'
import { currencyCodeSchema, minorAmountSchema } from './currency'
import { TaxBehaviorSchema } from './invoice-preference'

export const recurringInvoiceStatusSchema = z.enum([
  'active',
  'paused',
  'stopped',
  'expired',
])
export const recurringInvoiceGenerationModeSchema = z.enum([
  'draft',
  'finalize',
  'finalize-and-send',
])
export const recurringInvoiceFrequencySchema = z.strictObject({
  intervalUnit: z.enum(['day', 'week', 'month', 'year']),
  intervalCount: z.number().int().min(1).max(365),
})

const shape = {
  profileName: z.string().trim().min(1).max(200),
  customerId: IdSchema,
  currency: currencyCodeSchema,
  frequency: recurringInvoiceFrequencySchema,
  startAt: unixTimestampSchema,
  endAt: unixTimestampSchema.nullable().optional(),
  maxCycles: z.number().int().min(1).nullable().optional(),
  generationMode: recurringInvoiceGenerationModeSchema,
  paymentTermId: IdSchema.nullable().optional(),
  salespersonId: IdSchema.nullable().optional(),
  priceListId: IdSchema.nullable().optional(),
  taxBehavior: TaxBehaviorSchema.optional(),
  notes: optionalTextSchema,
  terms: optionalTextSchema,
  discountAmount: minorAmountSchema.optional(),
  lines: z.array(DocumentLineCreateSchema).min(1).max(100),
}

const recurringInvoiceBaseSchema = z.strictObject(shape)

export const RecurringInvoiceCreateSchema =
  recurringInvoiceBaseSchema.superRefine((value, ctx) => {
    if (
      value.endAt !== null &&
      value.endAt !== undefined &&
      value.endAt < value.startAt
    )
      ctx.addIssue({
        code: 'custom',
        message: 'endAt must not be before startAt.',
        path: ['endAt'],
      })
  })

export const RecurringInvoiceUpdateSchema = recurringInvoiceBaseSchema
  .partial()
  .superRefine((value, ctx) => {
    if (
      value.startAt !== undefined &&
      value.endAt !== null &&
      value.endAt !== undefined &&
      value.endAt < value.startAt
    )
      ctx.addIssue({
        code: 'custom',
        message: 'endAt must not be before startAt.',
        path: ['endAt'],
      })
  })

export const RecurringInvoiceListQuerySchema = z.strictObject({
  status: recurringInvoiceStatusSchema.optional(),
  customerId: IdSchema.optional(),
})
export type RecurringInvoiceCreateParams = z.infer<
  typeof RecurringInvoiceCreateSchema
>
export type RecurringInvoiceUpdateParams = z.infer<
  typeof RecurringInvoiceUpdateSchema
>
export type RecurringInvoiceStatus = z.infer<
  typeof recurringInvoiceStatusSchema
>
