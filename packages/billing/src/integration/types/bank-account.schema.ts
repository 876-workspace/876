import { z } from 'zod'

import type { BillingBankAccount, BillingBankAccountList } from './bank-account'

/**
 * The schema for a Billing bank account resource.
 */
export const BillingBankAccountSchema = z.strictObject({
  object: z.literal('bank_account'),
  id: z.string().min(1),
  name: z.string(),
  accountType: z.enum([
    'CHECKING',
    'SAVINGS',
    'CREDIT_CARD',
    'CASH',
    'PAYPAL',
    'UNDEPOSITED_FUNDS',
    'PETTY_CASH',
  ]),
  currency: z.string().length(3),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<BillingBankAccount>

/**
 * The schema for a paginated list of Billing bank accounts.
 */
export const BillingBankAccountListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(BillingBankAccountSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
}) satisfies z.ZodType<BillingBankAccountList>
