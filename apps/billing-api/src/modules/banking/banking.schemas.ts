import { z } from 'zod'

const minorAmountSchema = z
  .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
  .transform((value) => BigInt(value))
export const bankAccountTypeSchema = z.enum([
  'CHECKING',
  'SAVINGS',
  'CREDIT_CARD',
  'CASH',
  'PAYPAL',
  'UNDEPOSITED_FUNDS',
  'PETTY_CASH',
])
export const bankAccountSchema = z.object({
  object: z.literal('bank_account'),
  id: z.string(),
  name: z.string(),
  accountType: bankAccountTypeSchema,
  currency: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  balance: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export const bankAccountCreateBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  accountType: bankAccountTypeSchema,
  currency: z.string().trim().length(3).toUpperCase(),
  description: z.string().trim().min(1).nullable().optional(),
})
export const bankAccountUpdateBodySchema = z
  .strictObject({
    name: z.string().trim().min(1).max(120).optional(),
    accountType: bankAccountTypeSchema.optional(),
    currency: z.string().trim().length(3).toUpperCase().optional(),
    description: z.string().trim().min(1).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Nothing to update.',
  })
export const bankAccountParamsSchema = z.object({
  accountId: z.string().min(1),
})

export const bankTransactionTypeSchema = z.enum(['CREDIT', 'DEBIT'])
export const bankTransactionStatusSchema = z.enum([
  'UNCATEGORIZED',
  'CATEGORIZED',
  'MATCHED',
  'EXCLUDED',
])
export const bankTransactionSchema = z.object({
  object: z.literal('bank_transaction'),
  id: z.string(),
  accountId: z.string(),
  paymentId: z.string().nullable(),
  type: bankTransactionTypeSchema,
  amount: z.string(),
  date: z.number().int(),
  description: z.string().nullable(),
  status: bankTransactionStatusSchema,
  reference: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export const bankTransactionCreateBodySchema = z.strictObject({
  type: bankTransactionTypeSchema,
  amount: minorAmountSchema.refine(
    (value) => value > 0n,
    'Amount must be positive.'
  ),
  date: z.number().int().positive(),
  description: z.string().trim().min(1).nullable().optional(),
  reference: z.string().trim().min(1).max(120).nullable().optional(),
})
export const bankTransactionUpdateBodySchema = z
  .strictObject({
    type: bankTransactionTypeSchema.optional(),
    amount: minorAmountSchema
      .refine((value) => value > 0n, 'Amount must be positive.')
      .optional(),
    date: z.number().int().positive().optional(),
    description: z.string().trim().min(1).nullable().optional(),
    status: z.enum(['UNCATEGORIZED', 'CATEGORIZED', 'EXCLUDED']).optional(),
    reference: z.string().trim().min(1).max(120).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Nothing to update.',
  })
export const bankTransactionParamsSchema = z.object({
  accountId: z.string().min(1),
  transactionId: z.string().min(1),
})
export const bankAccountDeletedSchema = z.object({
  object: z.literal('bank_account'),
  id: z.string(),
  deleted: z.literal(true),
})
export const bankTransactionDeletedSchema = z.object({
  object: z.literal('bank_transaction'),
  id: z.string(),
  deleted: z.literal(true),
})
export type BankAccountCreateBody = z.infer<typeof bankAccountCreateBodySchema>
export type BankAccountUpdateBody = z.infer<typeof bankAccountUpdateBodySchema>
export type BankTransactionCreateBody = z.infer<
  typeof bankTransactionCreateBodySchema
>
export type BankTransactionUpdateBody = z.infer<
  typeof bankTransactionUpdateBodySchema
>
