/* eslint-disable @typescript-eslint/no-explicit-any -- Compatibility record values preserve the legacy facade while transport moves to HTTP. */
import 'server-only'

import type { MemberAccess } from '@/types/access'
import type { Tenant } from '@/types/tenant'

import { billingApiRequest } from './api'

type AssociationEvent =
  | 'SUBSCRIPTION_ACTIVATION'
  | 'PLAN_CHANGE'
  | 'TRIAL_ACTIVATION'

type AddonAssociationRecord = LegacyBillingRecord & {
  addon: LegacyBillingRecord
  events: AssociationEvent[]
  plan: LegacyBillingRecord
}

interface TaxAuthorityCompatibility {
  id: string
  name: string
  description: string | null
  countryCode: string
  subdivisionCode: string | null
  isDefault: boolean
  isActive: boolean
  createdAt: number
  updatedAt: number
}

interface TaxRateCompatibility {
  id: string
  name: string
  description: string | null
  taxType: string | null
  rate: string
  inclusive: boolean
  startsAt: number | null
  isDefault: boolean
  isActive: boolean
  taxAuthority: TaxAuthorityCompatibility
  createdAt: number
  updatedAt: number
}

interface AddressCompatibility {
  label: string | null
  attention: string | null
  line1: string | null
  line2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  countryCode: string | null
}

interface ContactCompatibility {
  salutation: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
  workPhone: string | null
  mobilePhone: string | null
}

interface DocumentRecipientCompatibility extends LegacyBillingRecord {
  id: string
  name: string
  customerKind: 'INDIVIDUAL' | 'BUSINESS'
  companyName: string | null
  salutation: string | null
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  workPhone: string | null
  priceListId: string | null
}

export interface LegacyBillingRecord {
  /** Transitional boundary for endpoint-specific fields not yet modeled by @876/billing. */
  [key: string]: any
  addon: LegacyBillingRecord | null
  addonAssociations: AddonAssociationRecord[]
  advanceRules: LegacyBillingRecord[]
  allocations: LegacyBillingRecord[]
  amendments: LegacyBillingRecord[]
  addonApplicabilities: Array<{ addon: LegacyBillingRecord }>
  addresses: AddressCompatibility[]
  calendarDays: LegacyBillingRecord[]
  calendarMonths: LegacyBillingRecord[]
  charges: LegacyBillingRecord[]
  columns: LegacyBillingRecord[]
  contacts: ContactCompatibility[]
  convertedInvoice: LegacyBillingRecord | null
  customer: LegacyBillingRecord
  discounts: LegacyBillingRecord[]
  entries: LegacyBillingRecord[]
  events: LegacyBillingRecord[]
  invoiceAllocations: LegacyBillingRecord[]
  issuedInvoiceTotals: LegacyBillingRecord[]
  item: LegacyBillingRecord | null
  items: LegacyBillingRecord[]
  lifecycleSchedules: LegacyBillingRecord[]
  lines: LegacyBillingRecord[]
  plan: LegacyBillingRecord | null
  planApplicabilities: Array<{ plan: LegacyBillingRecord }>
  planAssociations: AddonAssociationRecord[]
  plans: LegacyBillingRecord[]
  prices: LegacyBillingRecord[]
  product: LegacyBillingRecord
  promotionCodes: LegacyBillingRecord[]
  recurringRevenue: LegacyBillingRecord[]
  redemptions: LegacyBillingRecord[]
  refunds: LegacyBillingRecord[]
  role: LegacyBillingRecord
  rules: LegacyBillingRecord[]
  statement: LegacyBillingRecord[]
  taxAuthority: LegacyBillingRecord
  tiers: LegacyBillingRecord[]
}

type LegacyValue = any

const id = encodeURIComponent

async function data(
  path: string,
  query?: Record<string, LegacyValue>
): Promise<LegacyBillingRecord> {
  return billingApiRequest({
    path: `/api/v1${path}`,
    query,
  }) as Promise<any>
}

async function list(
  path: string,
  query?: Record<string, LegacyValue>
): Promise<LegacyBillingRecord[]> {
  const result = await data(path, query)
  return result.data as LegacyBillingRecord[]
}

function detail(path: string) {
  return data(path)
}

function crud(path: string, idName: string) {
  return {
    list: (_tenantId: string, status?: LegacyValue) =>
      list(path, status === undefined ? undefined : { status }) as Promise<
        any[]
      >,
    retrieve: (_tenantId: string, resourceId: string) =>
      detail(`${path}/${id(resourceId)}`) as Promise<any>,
    create: (_tenantId: string, params: LegacyValue) =>
      billingApiRequest({
        method: 'POST',
        path: `/api/v1${path}`,
        body: params,
      }),
    update: (_tenantId: string, resourceId: string, params: LegacyValue) =>
      billingApiRequest({
        method: 'PATCH',
        path: `/api/v1${path}/${id(resourceId)}`,
        body: params,
      }),
    delete: (_tenantId: string, resourceId: string) =>
      billingApiRequest({
        method: 'DELETE',
        path: `/api/v1${path}/${id(resourceId)}`,
      }),
    idName,
  }
}

const products = {
  ...crud('/products', 'productId'),
  list: (_tenantId: string, isActive?: boolean) =>
    list('/products', { active: isActive }) as Promise<any[]>,
}

const plans = {
  ...crud('/plans', 'planId'),
  list: (_tenantId: string, isActive?: boolean, productId?: string) =>
    list('/plans', { active: isActive, productId }) as Promise<any[]>,
  retrieve: (_tenantId: string, planId: string) =>
    detail(`/plans/${id(planId)}`),
}

const prices = {
  ...crud('/prices', 'priceId'),
  list: (
    _tenantId: string,
    isActive?: boolean,
    owner?: { addonId?: string; itemId?: string; planId?: string }
  ) => list('/prices', { active: isActive, ...owner }) as Promise<any[]>,
  retrieve: (_tenantId: string, priceId: string) =>
    detail(`/prices/${id(priceId)}`),
}

const addons = {
  ...crud('/addons', 'addonId'),
  list: (_tenantId: string, isActive?: boolean, productId?: string) =>
    list('/addons', { active: isActive, productId }) as Promise<any[]>,
  retrieve: (_tenantId: string, addonId: string) =>
    detail(`/addons/${id(addonId)}`),
}

const priceLists = {
  ...crud('/price-lists', 'priceListId'),
  list: (_tenantId: string, isActive?: boolean) =>
    list('/price-lists', { active: isActive }) as Promise<any[]>,
  retrieve: (_tenantId: string, priceListId: string) =>
    detail(`/price-lists/${id(priceListId)}`),
}

const customers = {
  ...crud('/customers', 'customerId'),
  list: (_tenantId: string, status?: 'ACTIVE' | 'ARCHIVED') =>
    list('/customers', { status }),
  listCustomers: (_tenantId: string, status?: 'ACTIVE' | 'ARCHIVED') =>
    list('/customers', { status }),
  listDocumentRecipients: (tenantId: string) =>
    billingApiRequest({
      credential: 'internal',
      path: `/internal/projections/tenants/${id(tenantId)}/document-recipients`,
    }) as Promise<DocumentRecipientCompatibility[]>,
  retrieve: (_tenantId: string, customerId: string) =>
    detail(`/customers/${id(customerId)}`),
  account: (_tenantId: string, customerId: string) =>
    detail(`/customers/${id(customerId)}/account`),
}

const subscriptions = {
  ...crud('/subscriptions', 'subscriptionId'),
  list: (
    _tenantId: string,
    filters?: Record<string, LegacyValue>,
    _ownerUserId?: string
  ) => {
    void _ownerUserId
    return list('/subscriptions', filters)
  },
  retrieve: (_tenantId: string, subscriptionId: string) =>
    detail(`/subscriptions/${id(subscriptionId)}`),
  preferences: {
    retrieve: (_tenantId: string) => {
      void _tenantId
      return detail('/subscription-preferences')
    },
  },
  views: {
    list: (_tenantId: string, userId?: string) =>
      list('/subscription-views', { userId }),
  },
}

const invoices = {
  ...crud('/invoices', 'invoiceId'),
  list: (_tenantId: string, status?: string) =>
    list('/invoices', { status }) as Promise<any[]>,
  retrieve: (_tenantId: string, invoiceId: string) =>
    detail(`/invoices/${id(invoiceId)}`),
}

const quotes = {
  ...crud('/quotes', 'quoteId'),
  list: (_tenantId: string, status?: string) =>
    list('/quotes', { status }) as Promise<any[]>,
  retrieve: (_tenantId: string, quoteId: string) =>
    detail(`/quotes/${id(quoteId)}`),
}

const estimates = {
  ...crud('/estimates', 'estimateId'),
  list: (_tenantId: string, status?: string) =>
    list('/estimates', { status }) as Promise<any[]>,
}

const creditNotes = {
  ...crud('/credit-notes', 'creditNoteId'),
  list: (_tenantId: string, status?: string) =>
    list('/credit-notes', { status }) as Promise<any[]>,
  retrieve: (tenantId: string, creditNoteId: string) =>
    billingApiRequest({
      credential: 'internal',
      path: `/internal/projections/tenants/${id(tenantId)}/credit-notes/${id(creditNoteId)}`,
    }) as Promise<any>,
}

const paymentProviders = {
  listCatalog: () => list('/payment-providers'),
  connections: {
    list: (_tenantId: string) => {
      void _tenantId
      return list('/payment-providers/connections')
    },
  },
}

const discounts = {
  coupons: {
    ...crud('/discounts/coupons', 'couponId'),
    list: (_tenantId: string, isActive?: boolean) =>
      list('/discounts/coupons', { active: isActive }) as Promise<any[]>,
    retrieve: (_tenantId: string, couponId: string) =>
      detail(`/discounts/coupons/${id(couponId)}`),
  },
  promotionCodes: crud('/discounts/promotion-codes', 'promotionCodeId'),
}

/**
 * Source-compatible presentation facade backed exclusively by Billing HTTP.
 * Tenant IDs remain in signatures until page call sites adopt @876/billing;
 * authorization and tenant resolution are performed by the API principal.
 */
export const service = {
  addons,
  bankAccounts: crud('/banking/accounts', 'accountId'),
  bankTransactions: {
    list: (_tenantId: string, accountId: string) =>
      list(`/banking/accounts/${id(accountId)}/transactions`),
    retrieve: (_tenantId: string, accountId: string, transactionId: string) =>
      detail(
        `/banking/accounts/${id(accountId)}/transactions/${id(transactionId)}`
      ),
  },
  creditNotes,
  currencies: {
    list: (_tenantId: string) => {
      void _tenantId
      return list('/currencies')
    },
  },
  customers,
  dashboard: {
    overview: (tenantId: string) =>
      billingApiRequest({
        credential: 'internal',
        path: `/internal/projections/tenants/${id(tenantId)}/dashboard`,
      }) as Promise<any>,
  },
  discounts,
  estimates,
  financeConnections: {
    retrieve: (_tenantId: string, appId: string) =>
      detail(`/finance-connections/${id(appId)}`),
  },
  invoicePreferences: {
    retrieve: (_tenantId: string) => {
      void _tenantId
      return detail('/invoice-preferences')
    },
  },
  invoices,
  items: {
    ...crud('/items', 'itemId'),
    list: (_tenantId: string, status?: boolean | 'ACTIVE' | 'ARCHIVED') =>
      list('/items', {
        active:
          typeof status === 'boolean'
            ? status
            : status === undefined
              ? undefined
              : status === 'ACTIVE',
      }),
  },
  members: {
    list: (tenantId: string) =>
      billingApiRequest({
        credential: 'internal',
        path: `/internal/projections/tenants/${id(tenantId)}/members`,
      }) as Promise<any[]>,
    resolve: (tenantId: string, userId: string, organizationRole: string) =>
      billingApiRequest({
        credential: 'internal',
        method: 'POST',
        path: '/internal/projections/member-access',
        body: { tenantId, userId, organizationRole },
      }) as Promise<MemberAccess | null>,
  },
  paymentModes: crud('/payments/modes', 'modeId'),
  payments: crud('/payments', 'paymentId'),
  paymentProviders,
  paymentTerms: {
    list: (_tenantId: string) => {
      void _tenantId
      return list('/payment-terms')
    },
  },
  plans,
  prices,
  priceLists,
  products,
  quotes,
  refunds: crud('/refunds', 'refundId'),
  roles: crud('/roles', 'roleId'),
  salespeople: {
    list: (_tenantId: string) => {
      void _tenantId
      return list('/salespeople')
    },
  },
  stats: {},
  subscriptions,
  taxAuthorities: {
    ...crud('/tax-authorities', 'taxAuthorityId'),
    list: (_tenantId: string) => {
      void _tenantId
      return list('/tax-authorities') as unknown as Promise<
        TaxAuthorityCompatibility[]
      >
    },
  },
  taxRates: {
    ...crud('/tax-rates', 'taxRateId'),
    list: (_tenantId: string) => {
      void _tenantId
      return list('/tax-rates') as unknown as Promise<TaxRateCompatibility[]>
    },
  },
  tenants: {
    list: (params: { organizationIds: string[] }) =>
      billingApiRequest({
        credential: 'internal',
        method: 'POST',
        path: '/internal/projections/tenants',
        body: params,
      }) as Promise<Tenant[]>,
    retrieve: async (params: { organizationId?: string; slug?: string }) => {
      if (params.organizationId)
        return billingApiRequest({
          path: `/api/v1/integrations/organizations/${id(params.organizationId)}`,
          organizationId: params.organizationId,
        }) as Promise<Tenant | null>
      return data('/tenants/resolve', {
        slug: params.slug,
      }) as unknown as Promise<Tenant | null>
    },
  },
  vendors: crud('/vendors', 'vendorId'),
}
