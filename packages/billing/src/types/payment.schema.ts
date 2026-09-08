import { z } from 'zod'

import type { Payment, PaymentCreated, PaymentDeleted } from './payment'
import type { List } from './common'
import {
  createdResourceSchema,
  deletedResourceSchema,
  listSchema,
} from './common.schema'
import { BankAccountTypeSchema } from './bank-account.schema'
import { BankTransactionSchema } from './bank-transaction.schema'
import { PaymentModeSchema } from './payment-mode.schema'

/**
 * The schema for a created payment response.
 */
export const PaymentCreatedSchema = createdResourceSchema(
  'payment'
) satisfies z.ZodType<PaymentCreated>

/**
 * The schema for a deleted payment tombstone.
 */
export const PaymentDeletedSchema = deletedResourceSchema(
  'payment'
) satisfies z.ZodType<PaymentDeleted>

const PaymentAllocationSchema = z.strictObject({
  object: z.literal('payment_allocation'),
  id: z.string().min(1),
  amount: z.string(),
  invoice: z.strictObject({
    object: z.literal('invoice'),
    id: z.string().min(1),
    number: z.string(),
    totalAmount: z.string(),
    amountDue: z.string(),
    status: z.string(),
  }),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

const PaymentRefundSchema = z.strictObject({
  object: z.literal('refund'),
  id: z.string().min(1),
  number: z.string(),
  amount: z.string(),
  currency: z.string(),
  reason: z.string().nullable(),
  refundedAt: z.number().int(),
  createdAt: z.number().int(),
})

/**
 * The schema for a payment resource.
 */
export const PaymentSchema = z.strictObject({
  object: z.literal('payment'),
  id: z.string().min(1),
  number: z.string(),
  amount: z.string(),
  unappliedAmount: z.string(),
  amountRefunded: z.string(),
  status: z.enum([
    'PENDING',
    'REQUIRES_ACTION',
    'AUTHORIZED',
    'PROCESSING',
    'SUCCEEDED',
    'FAILED',
    'CANCELED',
    'PARTIALLY_REFUNDED',
    'REFUNDED',
    'DISPUTED',
  ]),
  providerConnectionId: z.string().nullable().optional(),
  providerPaymentId: z.string().nullable().optional(),
  bankCharges: z.string(),
  currency: z.string(),
  paymentDate: z.number().int(),
  referenceNumber: z.string().nullable(),
  notes: z.string().nullable(),
  customer: z.strictObject({
    object: z.literal('customer'),
    id: z.string().min(1),
    name: z.string(),
  }),
  paymentMode: PaymentModeSchema,
  depositAccount: z.strictObject({
    object: z.literal('bank_account'),
    id: z.string().min(1),
    name: z.string(),
    accountType: BankAccountTypeSchema,
    currency: z.string(),
  }),
  invoiceAllocations: z.array(PaymentAllocationSchema),
  refunds: z.array(PaymentRefundSchema).optional(),
  bankTransaction: BankTransactionSchema.nullable().optional(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<Payment>

/**
 * The schema for a paginated list of payments.
 */
export const PaymentListSchema = listSchema(PaymentSchema) satisfies z.ZodType<
  List<Payment>
>
