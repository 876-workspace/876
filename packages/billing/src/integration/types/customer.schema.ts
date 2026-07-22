import { z } from 'zod'

import type {
  BillingCustomer,
  BillingCustomerList,
  DeletedBillingCustomer,
} from './customer'

const customerTypeSchema = z.enum([
  'EXTERNAL',
  'CORE_USER',
  'CORE_ORGANIZATION',
])
const customerKindSchema = z.enum(['INDIVIDUAL', 'BUSINESS'])
const customerStatusSchema = z.enum(['ACTIVE', 'ARCHIVED'])

/**
 * Shared source metadata schema for integration resources.
 */
export const sourceSchema = z
  .strictObject({
    appId: z.string().min(1),
    externalReference: z.string().nullable(),
  })
  .nullable()

/**
 * The schema for a Billing customer resource.
 */
export const BillingCustomerSchema = z.strictObject({
  object: z.literal('customer'),
  id: z.string().min(1),
  source: sourceSchema,
  customerType: customerTypeSchema,
  customerKind: customerKindSchema,
  organizationId: z.string().nullable(),
  userId: z.string().nullable(),
  externalReference: z.string().nullable(),
  name: z.string(),
  salutation: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  companyName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  workPhone: z.string().nullable(),
  billingAddress: z.unknown().nullable(),
  metadata: z.unknown().nullable(),
  defaultCurrency: z.string().nullable(),
  language: z.string().nullable(),
  outstandingReceivable: z.string(),
  unusedCredits: z.string(),
  coreSyncedAt: z.number().int().nullable(),
  status: customerStatusSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  counts: z
    .strictObject({
      invoices: z.number().int(),
      quotes: z.number().int(),
      subscriptions: z.number().int(),
    })
    .optional(),
}) satisfies z.ZodType<BillingCustomer>

/**
 * The schema for a paginated list of Billing customers.
 */
export const BillingCustomerListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(BillingCustomerSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
}) satisfies z.ZodType<BillingCustomerList>

/**
 * The schema for a deleted customer tombstone.
 */
export const DeletedBillingCustomerSchema = z.strictObject({
  object: z.literal('customer'),
  id: z.string().min(1),
  deleted: z.literal(true),
}) satisfies z.ZodType<DeletedBillingCustomer>
