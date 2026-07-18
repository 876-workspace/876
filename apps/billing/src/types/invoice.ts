import { z } from 'zod'

import { IdSchema, optionalTextSchema, unixTimestampSchema } from './common'
import {
  currencyCodeSchema,
  minorAmountSchema,
  signedMinorAmountSchema,
} from './currency'
import { DocumentLineCreateSchema } from './document-line'
import { TaxBehaviorSchema } from './invoice-preference'

export type InvoiceStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'SENT'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'PAID'
  | 'UNCOLLECTIBLE'
  | 'VOID'

export const InvoiceCreateSchema = z
  .strictObject({
    quoteId: IdSchema.nullable().optional(),
    estimateId: IdSchema.nullable().optional(),
    customerId: IdSchema.nullable().optional(),
    subscriptionId: IdSchema.nullable().optional(),
    salespersonId: IdSchema.nullable().optional(),
    priceListId: IdSchema.nullable().optional(),
    currency: currencyCodeSchema.optional(),
    issueAt: unixTimestampSchema.optional(),
    dueAt: unixTimestampSchema.optional(),
    orderNumber: z.string().trim().min(1).max(120).nullable().optional(),
    referenceNumber: z.string().trim().min(1).max(120).nullable().optional(),
    subject: z.string().trim().min(1).max(300).nullable().optional(),
    taxBehavior: TaxBehaviorSchema.optional(),
    discountAmount: minorAmountSchema.optional(),
    shippingAmount: minorAmountSchema.optional(),
    adjustmentAmount: signedMinorAmountSchema.optional(),
    notes: optionalTextSchema,
    terms: optionalTextSchema,
    lines: z.array(DocumentLineCreateSchema).min(1).max(100).optional(),
  })
  .superRefine((value, context) => {
    if (value.quoteId || value.estimateId) {
      if (
        value.customerId ||
        value.lines ||
        value.currency ||
        value.subscriptionId ||
        value.priceListId ||
        (value.quoteId && value.estimateId)
      ) {
        context.addIssue({
          code: 'custom',
          message:
            'An invoice converted from a sales document cannot override its details.',
          path: [value.quoteId ? 'quoteId' : 'estimateId'],
        })
      }
      return
    }

    if (!value.customerId) {
      context.addIssue({
        code: 'custom',
        message: 'A manual invoice requires a customer.',
        path: ['customerId'],
      })
    }

    if (!value.lines) {
      context.addIssue({
        code: 'custom',
        message: 'A manual invoice requires at least one line.',
        path: ['lines'],
      })
    }
  })

export type InvoiceCreateParams = z.infer<typeof InvoiceCreateSchema>
export type InvoiceCreateInput = z.input<typeof InvoiceCreateSchema>

export interface InvoiceCreated {
  object: 'invoice'
  id: string
}

export const InvoiceUpdateSchema = z.strictObject({
  issueAt: unixTimestampSchema.nullable().optional(),
  dueAt: unixTimestampSchema.nullable().optional(),
  notes: optionalTextSchema,
  terms: optionalTextSchema,
  orderNumber: z.string().trim().min(1).max(120).nullable().optional(),
  referenceNumber: z.string().trim().min(1).max(120).nullable().optional(),
  subject: z.string().trim().min(1).max(300).nullable().optional(),
})

export type InvoiceUpdateParams = z.infer<typeof InvoiceUpdateSchema>
export type InvoiceUpdateInput = z.input<typeof InvoiceUpdateSchema>

export const InvoiceFinalizeSchema = z.strictObject({
  paymentTermId: IdSchema.nullable().optional(),
  salespersonId: IdSchema.nullable().optional(),
  autoApplyCredits: z.boolean().default(false),
})

export const InvoiceVoidSchema = z.strictObject({
  reason: z.string().trim().min(1).max(500).nullable().optional(),
})

export type InvoiceFinalizeParams = z.infer<typeof InvoiceFinalizeSchema>
export type InvoiceVoidParams = z.infer<typeof InvoiceVoidSchema>

export interface InvoiceUpdated {
  object: 'invoice'
  id: string
}

export interface InvoiceDeleted {
  object: 'invoice'
  id: string
  deleted: true
}

export type InvoiceResource = {
  object: 'invoice'
  id: string
} & Record<string, unknown>
