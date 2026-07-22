import { z } from 'zod'

import type {
  BankTransaction,
  BankTransactionCreated,
  BankTransactionDeleted,
} from './bank-transaction'
import type { List } from './common'
import {
  createdResourceSchema,
  deletedResourceSchema,
  listSchema,
} from './common.schema'

const BankTransactionTypeSchema = z.enum(['CREDIT', 'DEBIT'])
const BankTransactionStatusSchema = z.enum([
  'UNCATEGORIZED',
  'CATEGORIZED',
  'MATCHED',
  'EXCLUDED',
])

/**
 * The schema for a created bank transaction response.
 */
export const BankTransactionCreatedSchema = createdResourceSchema(
  'bank_transaction'
) satisfies z.ZodType<BankTransactionCreated>

/**
 * The schema for a deleted bank transaction tombstone.
 */
export const BankTransactionDeletedSchema = deletedResourceSchema(
  'bank_transaction'
) satisfies z.ZodType<BankTransactionDeleted>

/**
 * The schema for a bank transaction resource.
 */
export const BankTransactionSchema = z.strictObject({
  object: z.literal('bank_transaction'),
  id: z.string().min(1),
  accountId: z.string().min(1),
  paymentId: z.string().min(1).nullable(),
  type: BankTransactionTypeSchema,
  amount: z.string(),
  date: z.number().int(),
  description: z.string().nullable(),
  status: BankTransactionStatusSchema,
  reference: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<BankTransaction>

/**
 * The schema for a paginated list of bank transactions.
 */
export const BankTransactionListSchema = listSchema(
  BankTransactionSchema
) satisfies z.ZodType<List<BankTransaction>>
