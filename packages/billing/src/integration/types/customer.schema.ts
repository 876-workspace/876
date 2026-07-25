import { z } from 'zod'

import type {
  BillingContact,
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
 * The schema for a contact person attached to a Billing customer.
 */
export const BillingContactSchema = z.object({
  object: z.literal('contact'),
  id: z.string().min(1),
  userId: z.string().nullable(),
  salutation: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  workPhone: z.string().nullable(),
  mobilePhone: z.string().nullable(),
  isPrimary: z.boolean(),
  coreSyncedAt: z.number().int().nullable(),
}) satisfies z.ZodType<BillingContact>

/**
 * The schema for a Billing customer resource.
 *
 * `z.object` (strip) rather than `z.strictObject`: the Billing API serializes
 * resources by reflecting over every model column, so it emits additive fields
 * (payment terms, salesperson, price list, tax/late-fee attributes, …) that are
 * not part of this integration contract. Stripping unknown keys keeps the client
 * resilient to new Billing columns instead of failing validation on each one.
 */
export const BillingCustomerSchema = z.object({
  object: z.literal('customer'),
  id: z.string().min(1),
  sourceAppId: z.string().nullable(),
  sourceExternalReference: z.string().nullable(),
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
  // Older Billing deployments omit the field entirely; treat that as "no
  // contact" rather than failing the whole response.
  primaryContact: BillingContactSchema.nullish().transform(
    (value) => value ?? null
  ),
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
