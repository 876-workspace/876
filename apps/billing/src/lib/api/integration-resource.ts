import 'server-only'

import type { BankAccountType } from '@/types/banking'

import { Resource } from './billing-route'
import { PaymentResource } from './payment-resource'

type TenantRow = {
  id: string
  organizationId: string | null
  slug: string
  name: string
  countryCode: string
  status: string
  defaultCurrency: string
  defaultLanguage: string
  createdAt: number
  updatedAt: number
}

type CustomerRow = {
  id: string
  sourceAppId: string | null
  sourceExternalReference: string | null
  customerType: string
  customerKind: string
  organizationId: string | null
  userId: string | null
  externalReference: string | null
  name: string
  salutation: string | null
  firstName: string | null
  lastName: string | null
  companyName: string | null
  email: string | null
  phone: string | null
  workPhone: string | null
  billingAddress: unknown
  metadata: unknown
  defaultCurrency: string | null
  language: string | null
  outstandingReceivable: bigint
  unusedCredits: bigint
  coreSyncedAt: number | null
  status: string
  createdAt: number
  updatedAt: number
  _count?: {
    invoices: number
    quotes: number
    subscriptions: number
  }
}

/** Public integration projection of a Billing workspace linked to a core org. */
export function BillingOrganizationResource(tenant: TenantRow) {
  return Resource('billing_organization', {
    id: tenant.id,
    organizationId: tenant.organizationId,
    slug: tenant.slug,
    name: tenant.name,
    countryCode: tenant.countryCode,
    status: tenant.status,
    defaultCurrency: tenant.defaultCurrency,
    defaultLanguage: tenant.defaultLanguage,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
  })
}

/** Public integration projection that never exposes Billing's tenant key. */
export function BillingCustomerResource(customer: CustomerRow) {
  return Resource('customer', {
    id: customer.id,
    source: IntegrationSourceResource(customer),
    customerType: customer.customerType,
    customerKind: customer.customerKind,
    organizationId: customer.organizationId,
    userId: customer.userId,
    externalReference: customer.externalReference,
    name: customer.name,
    salutation: customer.salutation,
    firstName: customer.firstName,
    lastName: customer.lastName,
    companyName: customer.companyName,
    email: customer.email,
    phone: customer.phone,
    workPhone: customer.workPhone,
    billingAddress: customer.billingAddress,
    metadata: customer.metadata,
    defaultCurrency: customer.defaultCurrency,
    language: customer.language,
    outstandingReceivable: customer.outstandingReceivable,
    unusedCredits: customer.unusedCredits,
    coreSyncedAt: customer.coreSyncedAt,
    status: customer.status,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    ...(customer._count
      ? {
          counts: {
            invoices: customer._count.invoices,
            quotes: customer._count.quotes,
            subscriptions: customer._count.subscriptions,
          },
        }
      : {}),
  })
}

type IntegrationSourceRow = {
  sourceAppId: string | null
  sourceExternalReference: string | null
}

/** Exposes resource origin without leaking replay keys or payload hashes. */
export function IntegrationSourceResource(value: IntegrationSourceRow) {
  return value.sourceAppId
    ? {
        appId: value.sourceAppId,
        externalReference: value.sourceExternalReference,
      }
    : null
}

/** Payment projection with product origin added only at the integration edge. */
export function BillingPaymentResource(
  payment: Parameters<typeof PaymentResource>[0] & IntegrationSourceRow
) {
  return {
    ...PaymentResource(payment),
    source: IntegrationSourceResource(payment),
  }
}

type PaymentModeRow = {
  id: string
  name: string
  isDefault: boolean
  isActive: boolean
  isSystem: boolean
  createdAt: number
  updatedAt: number
}

/** Payment-creation option shared with a connected product app. */
export function BillingPaymentModeResource(mode: PaymentModeRow) {
  return Resource('payment_mode', {
    id: mode.id,
    name: mode.name,
    isDefault: mode.isDefault,
    isActive: mode.isActive,
    isSystem: mode.isSystem,
    createdAt: mode.createdAt,
    updatedAt: mode.updatedAt,
  })
}

type BankAccountRow = {
  id: string
  name: string
  accountType: BankAccountType
  currency: string
  description: string | null
  isActive: boolean
  createdAt: number
  updatedAt: number
}

/** Deposit-account option without balances or internal tenant identifiers. */
export function BillingBankAccountResource(account: BankAccountRow) {
  return Resource('bank_account', {
    id: account.id,
    name: account.name,
    accountType: account.accountType,
    currency: account.currency,
    description: account.description,
    isActive: account.isActive,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  })
}

type ItemRow = IntegrationSourceRow & {
  id: string
  type: string
  name: string
  sku: string | null
  unit: string | null
  description: string | null
  imageUrl: string | null
  defaultSellingAmount: bigint | null
  defaultSellingCurrency: string | null
  defaultCostAmount: bigint | null
  defaultCostCurrency: string | null
  isTaxable: boolean
  taxCode: string | null
  isActive: boolean
  metadata: unknown
  createdAt: number
  updatedAt: number
}

/** Public integration projection of a shared finance catalog item. */
export function BillingItemResource(item: ItemRow) {
  return Resource('item', {
    id: item.id,
    source: IntegrationSourceResource(item),
    type: item.type,
    name: item.name,
    sku: item.sku,
    unit: item.unit,
    description: item.description,
    imageUrl: item.imageUrl,
    defaultSellingAmount: item.defaultSellingAmount,
    defaultSellingCurrency: item.defaultSellingCurrency,
    defaultCostAmount: item.defaultCostAmount,
    defaultCostCurrency: item.defaultCostCurrency,
    isTaxable: item.isTaxable,
    taxCode: item.taxCode,
    isActive: item.isActive,
    metadata: item.metadata,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  })
}

type PlanRow = {
  id: string
  productId: string
  code: string
  name: string
  description: string | null
  entitlementReferenceId: string | null
  intervalUnit: string
  intervalCount: number
  billingCycleCount: number | null
  trialDays: number
  setupFeeAmount: bigint | null
  setupFeeCurrency: string | null
  isTaxable: boolean
  isActive: boolean
  metadata: unknown
  createdAt: number
  updatedAt: number
  product?: unknown
  prices?: unknown
}

/** Public integration projection of a Billing plan. */
export function BillingPlanResource(plan: PlanRow) {
  return Resource('plan', {
    id: plan.id,
    productId: plan.productId,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    entitlementReferenceId: plan.entitlementReferenceId,
    intervalUnit: plan.intervalUnit,
    intervalCount: plan.intervalCount,
    billingCycleCount: plan.billingCycleCount,
    trialDays: plan.trialDays,
    setupFeeAmount: plan.setupFeeAmount,
    setupFeeCurrency: plan.setupFeeCurrency,
    isTaxable: plan.isTaxable,
    isActive: plan.isActive,
    metadata: plan.metadata,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    ...(plan.product ? { product: plan.product } : {}),
    ...(plan.prices ? { prices: plan.prices } : {}),
  })
}

type SubscriptionRow = {
  id: string
  tenantId: string
  customerId: string
  sourceAppId: string | null
  externalReference: string | null
  status: string
  startAt: number | null
  currentPeriodStart: number | null
  currentPeriodEnd: number | null
  trialEndsAt: number | null
  cancelAtPeriodEnd: boolean
  canceledAt: number | null
  endedAt: number | null
  entitlementReferenceId: string | null
  metadata: unknown
  createdAt: number
  updatedAt: number
  customer?: unknown
  items?: unknown
}

/** Public integration projection of a Billing subscription. */
export function BillingSubscriptionResource(subscription: SubscriptionRow) {
  return Resource('subscription', {
    id: subscription.id,
    customerId: subscription.customerId,
    sourceAppId: subscription.sourceAppId,
    externalReference: subscription.externalReference,
    status: subscription.status,
    startAt: subscription.startAt,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    trialEndsAt: subscription.trialEndsAt,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    canceledAt: subscription.canceledAt,
    endedAt: subscription.endedAt,
    entitlementReferenceId: subscription.entitlementReferenceId,
    metadata: subscription.metadata,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    ...(subscription.customer ? { customer: subscription.customer } : {}),
    ...(subscription.items ? { items: subscription.items } : {}),
  })
}

type InvoiceLineRow = {
  id: string
  itemId: string | null
  priceId: string | null
  description: string
  unit: string | null
  position: number
  quantity: number
  unitAmount: bigint
  taxAmount: bigint
  discountAmount: bigint
  totalAmount: bigint
  createdAt: number
  updatedAt: number
}

type InvoiceRow = IntegrationSourceRow & {
  id: string
  tenantId: string
  customerId: string
  quoteId: string | null
  estimateId: string | null
  subscriptionId: string | null
  number: string
  status: string
  billingReason: string
  currency: string
  orderNumber: string | null
  referenceNumber: string | null
  subject: string | null
  taxBehavior: string
  issueAt: number | null
  dueAt: number | null
  sentAt: number | null
  paidAt: number | null
  voidedAt: number | null
  subtotalAmount: bigint
  taxAmount: bigint
  discountAmount: bigint
  shippingAmount: bigint
  adjustmentAmount: bigint
  totalAmount: bigint
  amountDue: bigint
  amountPaid: bigint
  amountCredited: bigint
  amountWrittenOff: bigint
  notes: string | null
  terms: string | null
  metadata: unknown
  createdAt: number
  updatedAt: number
  customer?: { id: string; name: string }
  lines?: InvoiceLineRow[]
}

/** Public integration projection of a Billing invoice. */
export function BillingInvoiceResource(invoice: InvoiceRow) {
  return Resource('invoice', {
    id: invoice.id,
    source: IntegrationSourceResource(invoice),
    customerId: invoice.customerId,
    quoteId: invoice.quoteId,
    estimateId: invoice.estimateId,
    subscriptionId: invoice.subscriptionId,
    number: invoice.number,
    status: invoice.status,
    billingReason: invoice.billingReason,
    currency: invoice.currency,
    orderNumber: invoice.orderNumber,
    referenceNumber: invoice.referenceNumber,
    subject: invoice.subject,
    taxBehavior: invoice.taxBehavior,
    issueAt: invoice.issueAt,
    dueAt: invoice.dueAt,
    sentAt: invoice.sentAt,
    paidAt: invoice.paidAt,
    voidedAt: invoice.voidedAt,
    subtotalAmount: invoice.subtotalAmount,
    taxAmount: invoice.taxAmount,
    discountAmount: invoice.discountAmount,
    shippingAmount: invoice.shippingAmount,
    adjustmentAmount: invoice.adjustmentAmount,
    totalAmount: invoice.totalAmount,
    amountDue: invoice.amountDue,
    amountPaid: invoice.amountPaid,
    amountCredited: invoice.amountCredited,
    amountWrittenOff: invoice.amountWrittenOff,
    notes: invoice.notes,
    terms: invoice.terms,
    metadata: invoice.metadata,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
    ...(invoice.customer
      ? {
          customer: Resource('customer', {
            id: invoice.customer.id,
            name: invoice.customer.name,
          }),
        }
      : {}),
    ...(invoice.lines
      ? {
          lines: invoice.lines.map((line) =>
            Resource('invoice_line', {
              id: line.id,
              itemId: line.itemId,
              priceId: line.priceId,
              description: line.description,
              unit: line.unit,
              position: line.position,
              quantity: line.quantity,
              unitAmount: line.unitAmount,
              taxAmount: line.taxAmount,
              discountAmount: line.discountAmount,
              totalAmount: line.totalAmount,
              createdAt: line.createdAt,
              updatedAt: line.updatedAt,
            })
          ),
        }
      : {}),
  })
}
