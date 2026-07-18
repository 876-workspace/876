import { z } from 'zod'

import type {
  BillingCustomer,
  BillingCustomerList,
  BillingInvoice,
  BillingInvoiceList,
  BillingItem,
  BillingItemList,
  BillingOrganization,
  BillingBankAccount,
  BillingBankAccountList,
  BillingPayment,
  BillingPaymentList,
  BillingPaymentMode,
  BillingPaymentModeList,
  DeletedBillingCustomer,
  DeletedBillingItem,
} from './types'

const customerTypeSchema = z.enum([
  'EXTERNAL',
  'CORE_USER',
  'CORE_ORGANIZATION',
])
const customerKindSchema = z.enum(['INDIVIDUAL', 'BUSINESS'])
const customerStatusSchema = z.enum(['ACTIVE', 'ARCHIVED'])
const sourceSchema = z
  .strictObject({
    appId: z.string().min(1),
    externalReference: z.string().nullable(),
  })
  .nullable()

export const BillingOrganizationSchema = z.strictObject({
  object: z.literal('billing_organization'),
  id: z.string().min(1),
  organizationId: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  countryCode: z.string().length(2),
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  defaultCurrency: z.string().length(3),
  defaultLanguage: z.string().min(2),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<BillingOrganization>

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

export const BillingCustomerListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(BillingCustomerSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
}) satisfies z.ZodType<BillingCustomerList>

export const DeletedBillingCustomerSchema = z.strictObject({
  object: z.literal('customer'),
  id: z.string().min(1),
  deleted: z.literal(true),
}) satisfies z.ZodType<DeletedBillingCustomer>

export const BillingItemSchema = z.strictObject({
  object: z.literal('item'),
  id: z.string().min(1),
  source: sourceSchema,
  type: z.enum(['GOOD', 'SERVICE']),
  name: z.string(),
  sku: z.string().nullable(),
  unit: z.string().nullable(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  defaultSellingAmount: z.string().nullable(),
  defaultSellingCurrency: z.string().nullable(),
  defaultCostAmount: z.string().nullable(),
  defaultCostCurrency: z.string().nullable(),
  isTaxable: z.boolean(),
  taxCode: z.string().nullable(),
  isActive: z.boolean(),
  metadata: z.unknown().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
}) satisfies z.ZodType<BillingItem>

export const BillingItemListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(BillingItemSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
}) satisfies z.ZodType<BillingItemList>

export const DeletedBillingItemSchema = z.strictObject({
  object: z.literal('item'),
  id: z.string().min(1),
  deleted: z.literal(true),
}) satisfies z.ZodType<DeletedBillingItem>

const invoiceStatusSchema = z.enum([
  'DRAFT',
  'OPEN',
  'SENT',
  'PARTIALLY_PAID',
  'OVERDUE',
  'PAID',
  'UNCOLLECTIBLE',
  'VOID',
])

const billingInvoiceLineSchema = z.strictObject({
  object: z.literal('invoice_line'),
  id: z.string().min(1),
  itemId: z.string().nullable(),
  priceId: z.string().nullable(),
  description: z.string(),
  unit: z.string().nullable(),
  position: z.number().int(),
  quantity: z.number().int(),
  unitAmount: z.string(),
  taxAmount: z.string(),
  discountAmount: z.string(),
  totalAmount: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const BillingInvoiceSchema = z.strictObject({
  object: z.literal('invoice'),
  id: z.string().min(1),
  source: sourceSchema,
  customerId: z.string().min(1),
  quoteId: z.string().nullable(),
  estimateId: z.string().nullable(),
  subscriptionId: z.string().nullable(),
  number: z.string(),
  status: invoiceStatusSchema,
  billingReason: z.string(),
  currency: z.string().length(3),
  orderNumber: z.string().nullable(),
  referenceNumber: z.string().nullable(),
  subject: z.string().nullable(),
  taxBehavior: z.enum(['EXCLUSIVE', 'INCLUSIVE']),
  issueAt: z.number().int().nullable(),
  dueAt: z.number().int().nullable(),
  sentAt: z.number().int().nullable(),
  paidAt: z.number().int().nullable(),
  voidedAt: z.number().int().nullable(),
  subtotalAmount: z.string(),
  taxAmount: z.string(),
  discountAmount: z.string(),
  shippingAmount: z.string(),
  adjustmentAmount: z.string(),
  totalAmount: z.string(),
  amountDue: z.string(),
  amountPaid: z.string(),
  amountCredited: z.string(),
  amountWrittenOff: z.string(),
  notes: z.string().nullable(),
  terms: z.string().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  customer: z
    .strictObject({
      object: z.literal('customer'),
      id: z.string().min(1),
      name: z.string(),
    })
    .optional(),
  lines: z.array(billingInvoiceLineSchema).optional(),
}) satisfies z.ZodType<BillingInvoice>

export const BillingInvoiceListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(BillingInvoiceSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
}) satisfies z.ZodType<BillingInvoiceList>

const paymentModeSchema = z.strictObject({
  object: z.literal('payment_mode'),
  id: z.string().min(1),
  name: z.string(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  isSystem: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const BillingPaymentModeSchema =
  paymentModeSchema satisfies z.ZodType<BillingPaymentMode>

export const BillingPaymentModeListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(BillingPaymentModeSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
}) satisfies z.ZodType<BillingPaymentModeList>

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

export const BillingBankAccountListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(BillingBankAccountSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
}) satisfies z.ZodType<BillingBankAccountList>

const paymentAllocationSchema = z.strictObject({
  object: z.literal('payment_allocation'),
  id: z.string().min(1),
  amount: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  invoice: z.strictObject({
    object: z.literal('invoice'),
    id: z.string().min(1),
    number: z.string(),
    totalAmount: z.string(),
    amountDue: z.string(),
    status: z.string(),
  }),
})

export const BillingPaymentSchema = z.strictObject({
  object: z.literal('payment'),
  id: z.string().min(1),
  source: sourceSchema,
  number: z.string(),
  amount: z.string(),
  unappliedAmount: z.string(),
  status: z.enum(['PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED']),
  providerConnectionId: z.string().nullable(),
  providerPaymentId: z.string().nullable(),
  bankCharges: z.string(),
  currency: z.string().length(3),
  paymentDate: z.number().int(),
  referenceNumber: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  customer: z.strictObject({
    object: z.literal('customer'),
    id: z.string().min(1),
    name: z.string(),
  }),
  paymentMode: paymentModeSchema,
  depositAccount: z.strictObject({
    object: z.literal('bank_account'),
    id: z.string().min(1),
    name: z.string(),
    accountType: z.string(),
    currency: z.string().length(3),
  }),
  invoiceAllocations: z.array(paymentAllocationSchema),
  bankTransaction: z
    .strictObject({
      object: z.literal('bank_transaction'),
      id: z.string().min(1),
      accountId: z.string().min(1),
      paymentId: z.string().nullable(),
      type: z.enum(['CREDIT', 'DEBIT']),
      amount: z.string(),
      date: z.number().int(),
      description: z.string().nullable(),
      status: z.string(),
      reference: z.string().nullable(),
      createdAt: z.number().int(),
      updatedAt: z.number().int(),
    })
    .nullable()
    .optional(),
}) satisfies z.ZodType<BillingPayment>

export const BillingPaymentListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(BillingPaymentSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
}) satisfies z.ZodType<BillingPaymentList>
