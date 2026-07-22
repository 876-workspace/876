import { z } from 'zod'

import type { BillingPayment, BillingPaymentList } from './payment'
import { sourceSchema } from './customer.schema'
import { BillingPaymentModeSchema } from './payment-mode.schema'

const paymentAllocationSchema = z.strictObject({
  object: z.literal('payment_allocation'),
  id: z.string().min(1),
  amount: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  invoice: z.strictObject({
    object: z.literal('invoice'),
    id: z.string().min(1),
    number: z.string(),
    totalAmount: z.string(),
    amountDue: z.string(),
    status: z.string(),
  }),
})

/**
 * The schema for a Billing payment resource.
 */
export const BillingPaymentSchema = z.strictObject({
  object: z.literal('payment'),
  id: z.string().min(1),
  source: sourceSchema,
  number: z.string(),
  amount: z.string(),
  unappliedAmount: z.string(),
  status: z.enum(['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED']),
  providerConnectionId: z.string().nullable(),
  providerPaymentId: z.string().nullable(),
  bankCharges: z.string(),
  currency: z.string().length(3),
  paymentDate: z.number().int(),
  referenceNumber: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  customer: z.strictObject({
    object: z.literal('customer'),
    id: z.string().min(1),
    name: z.string(),
  }),
  paymentMode: BillingPaymentModeSchema,
  depositAccount: z.strictObject({
    object: z.literal('bank_account'),
    id: z.string().min(1),
    name: z.string(),
    accountType: z.string(),
    currency: z.string().length(3),
  }),
  invoiceAllocations: z.array(paymentAllocationSchema),
  bankTransaction: z
    .strictObject({
      object: z.literal('bank_transaction'),
      id: z.string().min(1),
      accountId: z.string().min(1),
      paymentId: z.string().nullable(),
      type: z.enum(['CREDIT', 'DEBIT']),
      amount: z.string(),
      date: z.number().int(),
      description: z.string().nullable(),
      status: z.string(),
      reference: z.string().nullable(),
      createdAt: z.number().int(),
      updatedAt: z.number().int(),
    })
    .nullable()
    .optional(),
}) satisfies z.ZodType<BillingPayment>

/**
 * The schema for a paginated list of Billing payments.
 */
export const BillingPaymentListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(BillingPaymentSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
}) satisfies z.ZodType<BillingPaymentList>
