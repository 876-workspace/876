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

export const BankAccountCreatedSchema = createdResourceSchema(
  'bank_account'
) satisfies z.ZodType<BankAccountCreated>

export const BankAccountDeletedSchema = deletedResourceSchema(
  'bank_account'
) satisfies z.ZodType<BankAccountDeleted>

export const BankAccountSchema = z.strictObject({
  object: z.literal('bank_account'),
  id: z.string().min(1),
  name: z.string(),
  accountType: BankAccountTypeSchema,
  currency: z.string(),
  description: z.string().nullable(),
  directoryBankId: z.string().nullable(),
  directoryBranchId: z.string().nullable(),
  institutionName: z.string().nullable(),
  accountHolderName: z.string().nullable(),
  accountNumberLast4: z.string().nullable(),
  openingBalance: z.string(),
  openingBalanceAt: z.number().int().nullable(),
  isActive: z.boolean(),
  balance: z.string(),
  booksBalance: z.string(),
  bankBalance: z.string().nullable(),
  bankBalanceAt: z.number().int().nullable(),
  lastStatementBalance: z.string().nullable(),
  lastStatementAt: z.number().int().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<BankAccount>

export const BankAccountListSchema = listSchema(
  BankAccountSchema
) satisfies z.ZodType<List<BankAccount>>
