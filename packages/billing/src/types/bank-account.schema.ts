import { z } from 'zod'

import type {
  BankAccount,
  BankAccountCreated,
  BankAccountDeleted,
} from './bank-account'
import type { List } from './common'
import {
  createdResourceSchema,
  deletedResourceSchema,
  listSchema,
} from './common.schema'

const BankAccountTypeSchema = z.enum([
  'CHECKING',
  'SAVINGS',
  'CREDIT_CARD',
  'CASH',
  'PAYPAL',
  'UNDEPOSITED_FUNDS',
  'PETTY_CASH',
])

export { BankAccountTypeSchema }

/**
 * The schema for a created bank account response.
 */
export const BankAccountCreatedSchema = createdResourceSchema(
  'bank_account'
) satisfies z.ZodType<BankAccountCreated>

/**
 * The schema for a deleted bank account tombstone.
 */
export const BankAccountDeletedSchema = deletedResourceSchema(
  'bank_account'
) satisfies z.ZodType<BankAccountDeleted>

/**
 * The schema for a bank account resource.
 */
export const BankAccountSchema = z.strictObject({
  object: z.literal('bank_account'),
  id: z.string().min(1),
  name: z.string(),
  accountType: BankAccountTypeSchema,
  currency: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  balance: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<BankAccount>

/**
 * The schema for a paginated list of bank accounts.
 */
export const BankAccountListSchema = listSchema(
  BankAccountSchema
) satisfies z.ZodType<List<BankAccount>>
