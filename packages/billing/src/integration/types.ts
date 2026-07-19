import type { Error, List, Result } from '../types'

export interface IntegrationClientOptions {
  /** Billing service origin. Defaults from `BILLING_URL`. */
  baseUrl?: string
  /** Platform-admin credential for Console. Server-side only. */
  internalKey?: string
  /** Calling product app's 876 API key. Server-side only. */
  apiKey?: string
  /** Short-lived 876 OAuth access token for a delegated integration. */
  accessToken?: string
  /** Optional fetch implementation for tests or custom runtimes. */
  fetch?: typeof fetch
  /** Optional request ID propagated across service boundaries. */
  requestId?: string
}

export interface IntegrationCreateOptions {
  /** Stable retry key, unique per product app and resource type. */
  idempotencyKey: string
}

export interface BillingSource {
  appId: string
  externalReference: string | null
}

export interface BillingOrganization {
  object: 'billing_organization'
  id: string
  organizationId: string
  slug: string
  name: string
  countryCode: string
  status: 'ACTIVE' | 'SUSPENDED'
  defaultCurrency: string
  defaultLanguage: string
  createdAt: number
  updatedAt: number
}

export type BillingCustomerType = 'EXTERNAL' | 'CORE_USER' | 'CORE_ORGANIZATION'
export type BillingCustomerKind = 'INDIVIDUAL' | 'BUSINESS'
export type BillingCustomerStatus = 'ACTIVE' | 'ARCHIVED'

export interface BillingCustomerContact {
  object: 'customer_contact'
  id: string
  salutation: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
  workPhone: string | null
  mobilePhone: string | null
  isPrimary: boolean
  createdAt: number
  updatedAt: number
}

export interface BillingCustomerAddress {
  object: 'customer_address'
  id: string
  type: string
  label: string | null
  attention: string | null
  line1: string | null
  line2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  countryCode: string | null
  isDefault: boolean
  createdAt: number
  updatedAt: number
}

export interface BillingCustomer {
  object: 'customer'
  id: string
  source: BillingSource | null
  customerType: BillingCustomerType
  customerKind: BillingCustomerKind
  organizationId: string | null
  userId: string | null
  externalReference: string | null
  customerNumber: string | null
  name: string
  salutation: string | null
  firstName: string | null
  lastName: string | null
  companyName: string | null
  email: string | null
  phone: string | null
  workPhone: string | null
  website: string | null
  notes: string | null
  taxRegistrationNumber: string | null
  billingAddress: unknown | null
  metadata: unknown | null
  defaultCurrency: string | null
  language: string | null
  outstandingReceivable: string
  unusedCredits: string
  coreSyncedAt: number | null
  status: BillingCustomerStatus
  createdAt: number
  updatedAt: number
  counts?: {
    invoices: number
    quotes: number
    subscriptions: number
  }
  contacts?: BillingCustomerContact[]
  addresses?: BillingCustomerAddress[]
}

export interface BillingCustomerCreateParams {
  name: string
  customerKind?: BillingCustomerKind
  salutation?: string | null
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
  email?: string | null
  phone?: string | null
  workPhone?: string | null
  customerNumber?: string | null
  website?: string | null
  notes?: string | null
  taxRegistrationNumber?: string | null
  currency?: string | null
  language?: string | null
  customerType?: BillingCustomerType
  organizationId?: string | null
  userId?: string | null
  sourceExternalReference?: string | null
}

export interface BillingCustomerListParams {
  limit?: number
  starting_after?: string
  ending_before?: string
  /** Resolve the one shared Billing customer linked to a Core user. */
  user_id?: string
  /** Resolve the one shared Billing customer linked to a Core organization. */
  organization_id?: string
  status?: 'active' | 'archived'
}

export type BillingCustomerUpdateParams = Partial<
  Pick<
    BillingCustomer,
    | 'name'
    | 'customerKind'
    | 'salutation'
    | 'firstName'
    | 'lastName'
    | 'companyName'
    | 'email'
    | 'phone'
    | 'workPhone'
    | 'customerNumber'
    | 'website'
    | 'notes'
    | 'taxRegistrationNumber'
    | 'language'
    | 'status'
  > & { currency: string | null }
>

export interface BillingCustomerImportAddressParams {
  label?: string | null
  attention?: string | null
  line1?: string | null
  line2?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  countryCode?: string | null
}

export interface BillingCustomerImportContactParams {
  salutation?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  workPhone?: string | null
  mobilePhone?: string | null
}

export interface BillingCustomerImportRowParams {
  rowNumber: number
  name: string
  customerKind?: BillingCustomerKind
  salutation?: string | null
  firstName?: string | null
  lastName?: string | null
  companyName?: string | null
  email?: string | null
  phone?: string | null
  workPhone?: string | null
  currency?: string | null
  language?: string | null
  customerNumber?: string | null
  website?: string | null
  notes?: string | null
  taxRegistrationNumber?: string | null
  billingAddress?: BillingCustomerImportAddressParams
  shippingAddress?: BillingCustomerImportAddressParams
  contact?: BillingCustomerImportContactParams
}

export interface BillingCustomerImportParams {
  dryRun?: boolean
  duplicateStrategy: 'skip' | 'update'
  rows: BillingCustomerImportRowParams[]
}

export interface BillingCustomerImportRowResult {
  rowNumber: number
  action: 'created' | 'updated' | 'skipped' | 'failed'
  customerId: string | null
  error: { code: string; message: string } | null
}

export interface BillingCustomerImportResult {
  object: 'customer_import'
  dryRun: boolean
  duplicateStrategy: 'skip' | 'update'
  summary: {
    created: number
    updated: number
    skipped: number
    failed: number
  }
  results: BillingCustomerImportRowResult[]
}

export interface DeletedBillingCustomer {
  object: 'customer'
  id: string
  deleted: true
}

export type BillingItemType = 'GOOD' | 'SERVICE'

export interface BillingItem {
  object: 'item'
  id: string
  source: BillingSource | null
  type: BillingItemType
  name: string
  sku: string | null
  unit: string | null
  description: string | null
  imageUrl: string | null
  defaultSellingAmount: string | null
  defaultSellingCurrency: string | null
  defaultCostAmount: string | null
  defaultCostCurrency: string | null
  isTaxable: boolean
  taxCode: string | null
  isActive: boolean
  metadata: unknown | null
  createdAt: number
  updatedAt: number
}

export interface BillingItemCreateParams {
  type: BillingItemType
  name: string
  sku?: string | null
  unit?: string | null
  description?: string | null
  imageUrl?: string | null
  defaultSellingAmount?: number | string | null
  defaultSellingCurrency?: string | null
  defaultCostAmount?: number | string | null
  defaultCostCurrency?: string | null
  isTaxable?: boolean
  taxCode?: string | null
  sourceExternalReference?: string | null
}

export type BillingItemUpdateParams = Partial<
  Omit<BillingItemCreateParams, 'sourceExternalReference'> & {
    isActive: boolean
  }
>

export interface BillingItemListParams {
  active?: boolean
}

export interface DeletedBillingItem {
  object: 'item'
  id: string
  deleted: true
}

export type BillingInvoiceStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'SENT'
  | 'PARTIALLY_PAID'
  | 'OVERDUE'
  | 'PAID'
  | 'UNCOLLECTIBLE'
  | 'VOID'

export interface BillingInvoiceLineCreateParams {
  itemId?: string | null
  priceId?: string | null
  description?: string | null
  quantity?: number
  unitAmount?: number | string | null
  taxAmount?: number | string
  discountAmount?: number | string
}

export interface BillingInvoiceCreateParams {
  customerId: string
  subscriptionId?: string | null
  salespersonId?: string | null
  priceListId?: string | null
  currency?: string
  issueAt?: number
  dueAt?: number
  orderNumber?: string | null
  referenceNumber?: string | null
  subject?: string | null
  taxBehavior?: 'EXCLUSIVE' | 'INCLUSIVE'
  discountAmount?: number | string
  shippingAmount?: number | string
  adjustmentAmount?: number | string
  notes?: string | null
  terms?: string | null
  lines: BillingInvoiceLineCreateParams[]
  sourceExternalReference?: string | null
}

export interface BillingInvoiceUpdateParams {
  issueAt?: number | null
  dueAt?: number | null
  notes?: string | null
  terms?: string | null
  orderNumber?: string | null
  referenceNumber?: string | null
  subject?: string | null
}

export interface BillingInvoiceFinalizeParams {
  paymentTermId?: string | null
  salespersonId?: string | null
  autoApplyCredits?: boolean
}

export interface BillingInvoiceVoidParams {
  reason?: string | null
}

export interface BillingInvoiceLine {
  object: 'invoice_line'
  id: string
  itemId: string | null
  priceId: string | null
  description: string
  unit: string | null
  position: number
  quantity: number
  unitAmount: string
  taxAmount: string
  discountAmount: string
  totalAmount: string
  createdAt: number
  updatedAt: number
}

export interface BillingInvoice {
  object: 'invoice'
  id: string
  source: BillingSource | null
  customerId: string
  quoteId: string | null
  estimateId: string | null
  subscriptionId: string | null
  number: string
  status: BillingInvoiceStatus
  billingReason: string
  currency: string
  orderNumber: string | null
  referenceNumber: string | null
  subject: string | null
  taxBehavior: 'EXCLUSIVE' | 'INCLUSIVE'
  issueAt: number | null
  dueAt: number | null
  sentAt: number | null
  paidAt: number | null
  voidedAt: number | null
  subtotalAmount: string
  taxAmount: string
  discountAmount: string
  shippingAmount: string
  adjustmentAmount: string
  totalAmount: string
  amountDue: string
  amountPaid: string
  amountCredited: string
  amountWrittenOff: string
  notes: string | null
  terms: string | null
  metadata: unknown | null
  createdAt: number
  updatedAt: number
  customer?: { object: 'customer'; id: string; name: string }
  lines?: BillingInvoiceLine[]
}

export interface BillingInvoiceListParams {
  status?: BillingInvoiceStatus
}

export interface BillingPaymentAllocationCreateParams {
  invoiceId: string
  amount: number | string
}

export interface BillingPaymentCreateParams {
  customerId: string
  paymentModeId: string
  depositAccountId: string
  amount: number | string
  bankCharges?: number | string
  currency: string
  paymentDate: number
  referenceNumber?: string | null
  notes?: string | null
  allocations?: BillingPaymentAllocationCreateParams[]
  sourceExternalReference?: string | null
}

export interface BillingPayment {
  object: 'payment'
  id: string
  source: BillingSource | null
  number: string
  amount: string
  unappliedAmount: string
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED'
  providerConnectionId: string | null
  providerPaymentId: string | null
  bankCharges: string
  currency: string
  paymentDate: number
  referenceNumber: string | null
  notes: string | null
  customer: { object: 'customer'; id: string; name: string }
  paymentMode: {
    object: 'payment_mode'
    id: string
    name: string
    isDefault: boolean
    isActive: boolean
    isSystem: boolean
    createdAt: number
    updatedAt: number
  }
  depositAccount: {
    object: 'bank_account'
    id: string
    name: string
    accountType: string
    currency: string
  }
  invoiceAllocations: Array<{
    object: 'payment_allocation'
    id: string
    amount: string
    createdAt: number
    updatedAt: number
    invoice: {
      object: 'invoice'
      id: string
      number: string
      totalAmount: string
      amountDue: string
      status: string
    }
  }>
  bankTransaction?: {
    object: 'bank_transaction'
    id: string
    accountId: string
    paymentId: string | null
    type: 'CREDIT' | 'DEBIT'
    amount: string
    date: number
    description: string | null
    status: string
    reference: string | null
    createdAt: number
    updatedAt: number
  } | null
  createdAt: number
  updatedAt: number
}

export interface BillingPaymentMode {
  object: 'payment_mode'
  id: string
  name: string
  isDefault: boolean
  isActive: boolean
  isSystem: boolean
  createdAt: number
  updatedAt: number
}

export type BillingBankAccountType =
  | 'CHECKING'
  | 'SAVINGS'
  | 'CREDIT_CARD'
  | 'CASH'
  | 'PAYPAL'
  | 'UNDEPOSITED_FUNDS'
  | 'PETTY_CASH'

export interface BillingBankAccount {
  object: 'bank_account'
  id: string
  name: string
  accountType: BillingBankAccountType
  currency: string
  description: string | null
  isActive: boolean
  createdAt: number
  updatedAt: number
}

export type BillingCustomerList = List<BillingCustomer>
export type BillingItemList = List<BillingItem>
export type BillingInvoiceList = List<BillingInvoice>
export type BillingPaymentList = List<BillingPayment>
export type BillingPaymentModeList = List<BillingPaymentMode>
export type BillingBankAccountList = List<BillingBankAccount>
export type IntegrationError = Error
export type IntegrationResult<T> = Result<T>
