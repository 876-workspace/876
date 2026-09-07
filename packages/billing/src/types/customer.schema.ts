import { z } from 'zod'

import type {
  Customer,
  CustomerAccount,
  CustomerContact,
  CustomerContactCreated,
  CustomerContactList,
  CustomerCreated,
  DeletedCustomerContact,
  CustomerList,
  DeletedCustomer,
} from './customer'
import {
  createdResourceSchema,
  deletedResourceSchema,
  listSchema,
} from './common.schema'

/**
 * The schema for a created customer response.
 */
export const CustomerCreatedSchema = createdResourceSchema(
  'customer'
) satisfies z.ZodType<CustomerCreated>

export const CustomerContactCreatedSchema = createdResourceSchema(
  'contact'
) satisfies z.ZodType<CustomerContactCreated>

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

/**
 * The schema for a customer contact person.
 */
export const CustomerContactSchema = z.object({
  object: z.literal('contact'),
  id: z.string(),
  userId: z.string().nullable(),
  salutation: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  workPhone: z.string().nullable(),
  mobilePhone: z.string().nullable(),
  avatar: z.string().nullable(),
  isPrimary: z.boolean(),
  coreSyncedAt: z.number().int().nullable(),
}) satisfies z.ZodType<CustomerContact>

export const CustomerContactListSchema = listSchema(
  CustomerContactSchema
) satisfies z.ZodType<CustomerContactList>

export const DeletedCustomerContactSchema = deletedResourceSchema(
  'contact'
) satisfies z.ZodType<DeletedCustomerContact>

/**
 * The schema for a full customer resource.
 */
export const CustomerSchema = z.object({
  object: z.literal('customer'),
  id: z.string(),
  sourceAppId: z.string().nullable(),
  sourceExternalReference: z.string().nullable(),
  customerType: z.enum(['EXTERNAL', 'CORE_USER', 'CORE_ORGANIZATION']),
  customerKind: z.enum(['INDIVIDUAL', 'BUSINESS']),
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
  status: z.enum(['ACTIVE', 'ARCHIVED']),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  primaryContact: CustomerContactSchema.nullable(),
  counts: z
    .object({
      subscriptions: z.number().int(),
      invoices: z.number().int(),
      quotes: z.number().int(),
    })
    .optional(),
}) satisfies z.ZodType<Customer>

/**
 * The schema for a paginated list of customers.
 */
export const CustomerListSchema = listSchema(
  CustomerSchema
) satisfies z.ZodType<CustomerList>

/**
 * The schema for a deleted customer tombstone.
 */
export const DeletedCustomerSchema = deletedResourceSchema(
  'customer'
) satisfies z.ZodType<DeletedCustomer>
