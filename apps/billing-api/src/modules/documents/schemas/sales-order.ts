import { z } from 'zod'

import { IdSchema, optionalTextSchema, unixTimestampSchema } from './common'
import { currencyCodeSchema } from './currency'
import { DocumentLineCreateSchema } from './document-line'
import { TaxBehaviorSchema } from './invoice-preference'

export const SalesOrderStatusSchema = z.enum([
  'draft',
  'confirmed',
  'completed',
  'canceled',
])

export const SalesOrderInvoicingStatusSchema = z.enum([
  'not-invoiced',
  'invoiced',
])

export const SalesOrderPaymentStatusSchema = z.enum([
  'unpaid',
  'partially-paid',
  'paid',
])

export const SalesOrderParamsSchema = z.strictObject({
  salesOrderId: IdSchema,
})

export const SalesOrderQuoteParamsSchema = z.strictObject({
  quoteId: IdSchema,
})

export const SalesOrderCreateSchema = z.strictObject({
  customerId: IdSchema,
  salespersonId: IdSchema.nullable().optional(),
  priceListId: IdSchema.nullable().optional(),
  currency: currencyCodeSchema.optional(),
  orderedAt: unixTimestampSchema.optional(),
  referenceNumber: z.string().trim().min(1).max(120).nullable().optional(),
  taxBehavior: TaxBehaviorSchema.optional(),
  notes: optionalTextSchema,
  terms: optionalTextSchema,
  metadata: z.record(z.string(), z.json()).nullable().optional(),
  lines: z.array(DocumentLineCreateSchema).min(1).max(100),
})

export const SalesOrderUpdateSchema = z
  .strictObject({
    customerId: IdSchema.optional(),
    salespersonId: IdSchema.nullable().optional(),
    priceListId: IdSchema.nullable().optional(),
    currency: currencyCodeSchema.optional(),
    orderedAt: unixTimestampSchema.optional(),
    referenceNumber: z.string().trim().min(1).max(120).nullable().optional(),
    taxBehavior: TaxBehaviorSchema.optional(),
    notes: optionalTextSchema,
    terms: optionalTextSchema,
    metadata: z.record(z.string(), z.json()).nullable().optional(),
    lines: z.array(DocumentLineCreateSchema).min(1).max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })

export const SalesOrderListQuerySchema = z.strictObject({
  status: SalesOrderStatusSchema.optional(),
  customerId: IdSchema.optional(),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
})

export const SalesOrderQuoteConversionSchema = z.strictObject({
  salespersonId: IdSchema.nullable().optional(),
  orderedAt: unixTimestampSchema.optional(),
  referenceNumber: z.string().trim().min(1).max(120).nullable().optional(),
  taxBehavior: TaxBehaviorSchema.optional(),
  notes: optionalTextSchema,
  terms: optionalTextSchema,
})

export type SalesOrderStatus = z.infer<typeof SalesOrderStatusSchema>
export type SalesOrderCreateParams = z.infer<typeof SalesOrderCreateSchema>
export type SalesOrderUpdateParams = z.infer<typeof SalesOrderUpdateSchema>
export type SalesOrderListQuery = z.infer<typeof SalesOrderListQuerySchema>
export type SalesOrderQuoteConversionParams = z.infer<
  typeof SalesOrderQuoteConversionSchema
>
