import { z } from 'zod'

import { IdSchema, optionalShortTextSchema, optionalTextSchema, unixTimestampSchema } from './common'
import { currencyCodeSchema, minorAmountSchema } from './currency'
import { DocumentLineCreateSchema } from './document-line'
import { TaxBehaviorSchema } from './invoice-preference'

export type SalesReceiptStatus = 'PAID' | 'VOID'

const positiveMinorAmountSchema = minorAmountSchema.refine(
  (amount) => amount > 0n,
  'Enter an amount greater than zero.'
)

const salesReceiptCreateShape = {
  quoteId: IdSchema.nullable().optional(),
  customerId: IdSchema.nullable().optional(),
  salespersonId: IdSchema.nullable().optional(),
  priceListId: IdSchema.nullable().optional(),
  currency: currencyCodeSchema.optional(),
  receiptAt: unixTimestampSchema.optional(),
  referenceNumber: optionalShortTextSchema,
  taxBehavior: TaxBehaviorSchema.optional(),
  discountAmount: minorAmountSchema.optional(),
  notes: optionalTextSchema,
  terms: optionalTextSchema,
  lines: z.array(DocumentLineCreateSchema).min(1).max(100).optional(),
  paymentModeId: IdSchema,
  depositAccountId: IdSchema,
  paymentDate: unixTimestampSchema.optional(),
  paymentReferenceNumber: optionalShortTextSchema,
  bankCharges: minorAmountSchema.optional(),
}

function salesReceiptCreateSchema(integration: boolean) {
  return z
    .strictObject({
      ...salesReceiptCreateShape,
      ...(integration
        ? { sourceExternalReference: IdSchema.nullable().optional() }
        : {}),
    })
    .superRefine((value, context) => {
      if (value.quoteId) {
        if (
          value.customerId ||
          value.lines ||
          value.currency ||
          value.priceListId ||
          ('sourceExternalReference' in value && value.sourceExternalReference)
        ) {
          context.addIssue({
            code: 'custom',
            message:
              'A Sales Receipt converted from a quote cannot override the quote customer, currency, price list, or lines.',
            path: ['quoteId'],
          })
        }
      } else {
        if (!value.customerId)
          context.addIssue({
            code: 'custom',
            message: 'A manual Sales Receipt requires a customer.',
            path: ['customerId'],
          })
        if (!value.lines)
          context.addIssue({
            code: 'custom',
            message: 'A manual Sales Receipt requires at least one line.',
            path: ['lines'],
          })
      }

      if ((value.bankCharges ?? 0n) < 0n)
        context.addIssue({
          code: 'custom',
          message: 'Bank charges cannot be negative.',
          path: ['bankCharges'],
        })
    })
    .transform((value) => ({
      ...value,
      bankCharges: value.bankCharges ?? 0n,
      discountAmount: value.discountAmount ?? 0n,
    }))
}

export const SalesReceiptCreateSchema = salesReceiptCreateSchema(false)
export const IntegrationSalesReceiptCreateSchema = salesReceiptCreateSchema(true)

export type SalesReceiptCreateParams = z.infer<typeof SalesReceiptCreateSchema>
export type SalesReceiptCreateInput = z.input<typeof SalesReceiptCreateSchema>

export const SalesReceiptVoidSchema = z.strictObject({
  reason: z.string().trim().min(1).max(500).nullable().optional(),
})

export type SalesReceiptVoidParams = z.infer<typeof SalesReceiptVoidSchema>

export const SalesReceiptRefundSchema = z.strictObject({
  amount: positiveMinorAmountSchema,
  reason: z.string().trim().min(1).max(500).nullable().optional(),
})

export type SalesReceiptRefundParams = z.infer<typeof SalesReceiptRefundSchema>

export interface SalesReceiptCreated {
  object: 'sales_receipt'
  id: string
}

export interface SalesReceiptResource {
  object: 'sales_receipt'
  id: string
  number: string
  status: SalesReceiptStatus
  currency: string
  subtotalAmount: string
  taxAmount: string
  discountAmount: string
  totalAmount: string
  receiptAt: number
}
