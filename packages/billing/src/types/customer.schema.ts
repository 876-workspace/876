import { z } from 'zod'

import type { CustomerAccount, CustomerCreated } from './customer'
import { createdResourceSchema } from './common.schema'

/**
 * The schema for a created customer response.
 */
export const CustomerCreatedSchema = createdResourceSchema(
  'customer'
) satisfies z.ZodType<CustomerCreated>

const CustomerLedgerEntrySchema = z.object({
  object: z.literal('customer_ledger_entry'),
  id: z.string().min(1),
  type: z.string(),
  direction: z.enum(['DEBIT', 'CREDIT']),
  amount: z.string(),
  currency: z.string(),
  description: z.string().nullable(),
  effectiveAt: z.number().int(),
  invoiceId: z.string().nullable(),
  paymentId: z.string().nullable(),
  creditNoteId: z.string().nullable(),
  refundId: z.string().nullable(),
})

/**
 * The schema for a customer account and statement projection.
 */
export const CustomerAccountSchema = z.object({
  object: z.literal('customer_account'),
  customer: z.object({
    object: z.literal('customer'),
    id: z.string().min(1),
    name: z.string(),
  }),
  currency: z.string().nullable(),
  lifetimeBilled: z.string(),
  lifetimePaid: z.string(),
  outstandingReceivable: z.string(),
  availableCredit: z.string(),
  netPosition: z.string(),
  statement: z.array(CustomerLedgerEntrySchema),
}) satisfies z.ZodType<CustomerAccount>
