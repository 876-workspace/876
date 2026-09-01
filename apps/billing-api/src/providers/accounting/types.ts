export const accountingProviderKeys = ['zoho-books'] as const
export type AccountingProviderKey = (typeof accountingProviderKeys)[number]

export const accountingResourceTypes = [
  'customer',
  'item',
  'estimate',
  'invoice',
  'recurring-invoice',
  'payment',
] as const
export type AccountingResourceType = (typeof accountingResourceTypes)[number]

export interface AccountingProviderCapabilities {
  customers: boolean
  items: boolean
  estimates: boolean
  invoices: boolean
  recurringInvoices: boolean
  paymentsReceived: boolean
  imports: boolean
  webhooks: boolean
}

export interface AccountingProviderContext {
  tenantId: string
  connectionId: string
  providerOrganizationId: string
  apiDomain: string
  accessToken: string
}

export interface AccountingProviderWriteResult {
  externalId: string
  externalType: string
  rawStatus?: string | null
}

export interface AccountingProviderPage<T> {
  data: T[]
  page: number
  perPage: number
  hasMore: boolean
}

export interface AccountingCustomerInput {
  id: string
  name: string
  companyName?: string | null
  email?: string | null
  phone?: string | null
  status: 'ACTIVE' | 'ARCHIVED'
}

export interface AccountingItemInput {
  id: string
  name: string
  sku?: string | null
  unit?: string | null
  description?: string | null
  type: 'GOOD' | 'SERVICE'
  amount: bigint | null
  currency: string | null
  isTaxable: boolean
  isActive: boolean
}

export interface AccountingDocumentLineInput {
  providerItemId?: string | null
  description: string
  quantity: number
  unitAmount: bigint
  currency: string
}

export interface AccountingEstimateInput {
  id: string
  providerCustomerId: string
  number: string
  currency: string
  issueAt?: number | null
  expiresAt?: number | null
  notes?: string | null
  terms?: string | null
  lines: AccountingDocumentLineInput[]
}

export interface AccountingInvoiceInput {
  id: string
  providerCustomerId: string
  number: string
  currency: string
  issueAt?: number | null
  dueAt?: number | null
  referenceNumber?: string | null
  notes?: string | null
  terms?: string | null
  lines: AccountingDocumentLineInput[]
}

export interface AccountingRecurringInvoiceInput {
  id: string
  providerCustomerId: string
  name: string
  currency: string
  startAt?: number | null
  endAt?: number | null
  intervalUnit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
  intervalCount: number
  lines: AccountingDocumentLineInput[]
}

export interface AccountingPaymentAllocationInput {
  providerInvoiceId: string
  amount: bigint
}

export interface AccountingPaymentInput {
  id: string
  providerCustomerId: string
  amount: bigint
  currency: string
  paidAt: number
  paymentMode: string
  referenceNumber?: string | null
  notes?: string | null
  allocations: AccountingPaymentAllocationInput[]
}

export interface AccountingProviderResource<TInput, TRecord = unknown> {
  create(
    ctx: AccountingProviderContext,
    input: TInput
  ): Promise<AccountingProviderWriteResult>
  update(
    ctx: AccountingProviderContext,
    externalId: string,
    input: TInput
  ): Promise<AccountingProviderWriteResult>
  retrieve(ctx: AccountingProviderContext, externalId: string): Promise<TRecord>
  list(
    ctx: AccountingProviderContext,
    params?: { page?: number; perPage?: number }
  ): Promise<AccountingProviderPage<TRecord>>
}

export interface AccountingProviderAdapter {
  key: AccountingProviderKey
  capabilities: AccountingProviderCapabilities
  customers: AccountingProviderResource<AccountingCustomerInput>
  items: AccountingProviderResource<AccountingItemInput>
  estimates: AccountingProviderResource<AccountingEstimateInput>
  invoices: AccountingProviderResource<AccountingInvoiceInput>
  recurringInvoices: AccountingProviderResource<AccountingRecurringInvoiceInput>
  payments: AccountingProviderResource<AccountingPaymentInput>
}
