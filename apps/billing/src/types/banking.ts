import { z } from 'zod'

import {
  IdSchema,
  optionalShortTextSchema,
  optionalTextSchema,
  unixTimestampSchema,
} from './common'
import { currencyCodeSchema, minorAmountSchema } from './currency'

export const BankAccountTypeSchema = z.enum([
  'CHECKING',
  'SAVINGS',
  'CREDIT_CARD',
  'CASH',
  'PAYPAL',
  'UNDEPOSITED_FUNDS',
  'PETTY_CASH',
])

export const BankTransactionTypeSchema = z.enum(['CREDIT', 'DEBIT'])
export const BankTransactionStatusSchema = z.enum([
  'UNCATEGORIZED',
  'CATEGORIZED',
  'MATCHED',
  'EXCLUDED',
])

const positiveMinorAmountSchema = minorAmountSchema.refine(
  (amount) => amount > 0n,
  'Enter an amount greater than zero.'
)

export const BankAccountCreateSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  accountType: BankAccountTypeSchema,
  currency: currencyCodeSchema,
  description: optionalTextSchema,
})

export const BankAccountUpdateSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120).optional(),
    accountType: BankAccountTypeSchema.optional(),
    currency: currencyCodeSchema.optional(),
    description: optionalTextSchema,
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update.')

export const BankTransactionCreateSchema = z.strictObject({
  type: BankTransactionTypeSchema,
  amount: positiveMinorAmountSchema,
  date: unixTimestampSchema,
  description: optionalTextSchema,
  reference: optionalShortTextSchema,
})

export const BankTransactionUpdateSchema = z
  .strictObject({
    type: BankTransactionTypeSchema.optional(),
    amount: positiveMinorAmountSchema.optional(),
    date: unixTimestampSchema.optional(),
    description: optionalTextSchema,
    status: z.enum(['UNCATEGORIZED', 'CATEGORIZED', 'EXCLUDED']).optional(),
    reference: optionalShortTextSchema,
  })
  .refine((value) => Object.keys(value).length > 0, 'Nothing to update.')

export type BankAccountType = z.infer<typeof BankAccountTypeSchema>
export type BankTransactionType = z.infer<typeof BankTransactionTypeSchema>
export type BankTransactionStatus = z.infer<typeof BankTransactionStatusSchema>
export type BankAccountCreateParams = z.infer<typeof BankAccountCreateSchema>
export type BankAccountCreateInput = z.input<typeof BankAccountCreateSchema>
export type BankAccountUpdateParams = z.infer<typeof BankAccountUpdateSchema>
export type BankAccountUpdateInput = z.input<typeof BankAccountUpdateSchema>
export type BankTransactionCreateParams = z.infer<
  typeof BankTransactionCreateSchema
>
export type BankTransactionCreateInput = z.input<
  typeof BankTransactionCreateSchema
>
export type BankTransactionUpdateParams = z.infer<
  typeof BankTransactionUpdateSchema
>
export type BankTransactionUpdateInput = z.input<
  typeof BankTransactionUpdateSchema
>

export interface BankAccountCreated {
  object: 'bank_account'
  id: string
}

export interface BankTransactionCreated {
  object: 'bank_transaction'
  id: string
}

export interface BankAccountUpdated {
  object: 'bank_account'
  id: string
}

export interface BankTransactionUpdated {
  object: 'bank_transaction'
  id: string
}

export interface BankAccountDeleted {
  object: 'bank_account'
  id: string
  deleted: true
}

export interface BankTransactionDeleted {
  object: 'bank_transaction'
  id: string
  deleted: true
}

export interface BankAccountResource {
  object: 'bank_account'
  id: string
  name: string
  accountType: BankAccountType
  currency: string
  description: string | null
  isActive: boolean
  balance: string
  createdAt: number
  updatedAt: number
}

export interface BankTransactionResource {
  object: 'bank_transaction'
  id: string
  accountId: string
  paymentId: string | null
  type: BankTransactionType
  amount: string
  date: number
  description: string | null
  status: BankTransactionStatus
  reference: string | null
  createdAt: number
  updatedAt: number
}

export interface BankAccountView {
  id: string
  tenantId: string
  name: string
  accountType: BankAccountType
  currency: string
  description: string | null
  isActive: boolean
  balance: bigint
  createdAt: number
  updatedAt: number
}
