import { z } from 'zod'

import type { List } from './common'
import {
  createdResourceSchema,
  deletedResourceSchema,
  listSchema,
} from './common.schema'
import { BankAccountTypeSchema } from './bank-account.schema'
import { BankTransactionSchema } from './bank-transaction.schema'
import type { Payment, PaymentCreated, PaymentDeleted } from './payment'

/** The schema for a created payment response. */
export const PaymentCreatedSchema = createdResourceSchema(
  'payment'
) satisfies z.ZodType<PaymentCreated>

/** The schema for a deleted payment tombstone. */
export const PaymentDeletedSchema = deletedResourceSchema(
  'payment'
) satisfies z.ZodType<PaymentDeleted>

const PaymentAllocationSchema = z.object({
  object: z.literal('payment_allocation'),
  id: z.string().min(1),
  amount: z.string(),
  invoice: z.object({
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

/**
 * Stable public payment DTO. The API serializer includes internal relation
 * fields; this schema validates the public contract and strips those extras.
 */
export const PaymentSchema = z.object({
  object: z.literal('payment'),
  id: z.string().min(1),
  number: z.string(),
  amount: z.string(),
  unappliedAmount: z.string(),
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
  customer: z.object({
    object: z.literal('customer'),
    id: z.string().min(1),
    name: z.string(),
  }),
  paymentMode: z.object({
    object: z.literal('payment_mode'),
    id: z.string().min(1),
    name: z.string(),
    isDefault: z.boolean(),
    isActive: z.boolean(),
    isSystem: z.boolean(),
    createdAt: z.number().int(),
    updatedAt: z.number().int(),
  }),
  depositAccount: z.object({
    object: z.literal('bank_account'),
    id: z.string().min(1),
    name: z.string(),
    accountType: BankAccountTypeSchema,
    currency: z.string(),
  }),
  invoiceAllocations: z.array(PaymentAllocationSchema),
  bankTransaction: BankTransactionSchema.nullable().optional(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<Payment>

/** The schema for a paginated list of payments. */
export const PaymentListSchema = listSchema(PaymentSchema) satisfies z.ZodType<
  List<Payment>
>
