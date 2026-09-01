import { z } from 'zod'

export type AccountingProviderEnvironment = 'sandbox' | 'live'
export type AccountingConnectionMode = 'native' | 'mirror' | 'provider-backed'
export type AccountingConnectionStatus = 'pending' | 'active' | 'disabled' | 'error'
export type AccountingResourceType =
  | 'customer'
  | 'item'
  | 'estimate'
  | 'invoice'
  | 'recurring-invoice'
  | 'payment'
export type AccountingImportResourceType = 'customer' | 'item'

export interface AccountingProvider {
  object: 'accounting-provider'
  id: string
  key: string
  name: string
  adapter: string
  capabilities: {
    customers: boolean
    items: boolean
    estimates: boolean
    invoices: boolean
    recurringInvoices: boolean
    paymentsReceived: boolean
    imports: boolean
    webhooks: boolean
  }
  isActive: boolean
}

export interface AccountingProviderConnection {
  object: 'accounting-provider-connection'
  id: string
  providerId: string
  providerKey: string
  name: string
  environment: AccountingProviderEnvironment
  status: AccountingConnectionStatus
  mode: AccountingConnectionMode
  providerOrganizationId: string | null
  apiDomain: string | null
  scopes: string[]
  lastSyncedAt: number | null
  lastSuccessfulSyncAt: number | null
  lastErrorCode: string | null
  createdAt: number
  updatedAt: number
}

export interface AccountingProviderConnectionCreateParams {
  organizationId: string
  providerId: string
  name: string
  environment?: AccountingProviderEnvironment
  mode?: AccountingConnectionMode
}

export interface AccountingProviderConnectionUpdateParams {
  organizationId: string
  connectionId: string
  name?: string
  status?: AccountingConnectionStatus
  mode?: AccountingConnectionMode
}

export interface AccountingProviderConnectionParams {
  organizationId: string
  connectionId: string
}

export interface AccountingProviderAuthorization {
  object: 'accounting-provider-authorization'
  connectionId: string
  authorizeUrl: string
  expiresAt: number
}

export interface AccountingProviderReconcileParams
  extends AccountingProviderConnectionParams {
  resourceTypes?: AccountingResourceType[]
}

export interface AccountingProviderReconcile {
  object: 'accounting-provider-reconcile'
  connectionId: string
  resourceTypes: AccountingResourceType[]
  enqueued: number
}

export interface AccountingProviderImportListParams
  extends AccountingProviderConnectionParams {
  resourceType: AccountingImportResourceType
  page?: number
  perPage?: number
}

export interface AccountingProviderImportCandidate {
  object: 'accounting-provider-import-candidate'
  resourceType: AccountingImportResourceType
  externalId: string
  name: string
  secondary: string | null
  status: string | null
  mappedResourceId: string | null
}

export interface AccountingProviderAdoptParams
  extends AccountingProviderConnectionParams {
  resourceType: AccountingImportResourceType
  resourceId: string
  externalId: string
}

export interface AccountingProviderReleaseParams
  extends AccountingProviderConnectionParams {
  resourceType: AccountingImportResourceType
  resourceId: string
}

export interface AccountingProviderAdoption {
  object: 'accounting-provider-adoption'
  connectionId: string
  resourceType: AccountingImportResourceType
  resourceId: string
  externalId: string
}

export interface AccountingProviderAdoptionDeleted {
  object: 'accounting-provider-adoption'
  connectionId: string
  resourceType: AccountingImportResourceType
  resourceId: string
  deleted: true
}

const capabilitiesSchema = z.strictObject({
  customers: z.boolean(),
  items: z.boolean(),
  estimates: z.boolean(),
  invoices: z.boolean(),
  recurringInvoices: z.boolean(),
  paymentsReceived: z.boolean(),
  imports: z.boolean(),
  webhooks: z.boolean(),
})
const importResourceTypeSchema = z.enum(['customer', 'item'])
const resourceTypeSchema = z.enum([
  'customer',
  'item',
  'estimate',
  'invoice',
  'recurring-invoice',
  'payment',
])

export const accountingProviderSchema = z.strictObject({
  object: z.literal('accounting-provider'),
  id: z.string(),
  key: z.string(),
  name: z.string(),
  adapter: z.string(),
  capabilities: capabilitiesSchema,
  isActive: z.boolean(),
})
export const accountingProviderListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(accountingProviderSchema),
  has_more: z.boolean(),
  total_count: z.number().int(),
  url: z.string(),
})
export const accountingProviderConnectionSchema = z.strictObject({
  object: z.literal('accounting-provider-connection'),
  id: z.string(),
  providerId: z.string(),
  providerKey: z.string(),
  name: z.string(),
  environment: z.enum(['sandbox', 'live']),
  status: z.enum(['pending', 'active', 'disabled', 'error']),
  mode: z.enum(['native', 'mirror', 'provider-backed']),
  providerOrganizationId: z.string().nullable(),
  apiDomain: z.string().nullable(),
  scopes: z.array(z.string()),
  lastSyncedAt: z.number().int().nullable(),
  lastSuccessfulSyncAt: z.number().int().nullable(),
  lastErrorCode: z.string().nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export const accountingProviderConnectionListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(accountingProviderConnectionSchema),
  has_more: z.boolean(),
  total_count: z.number().int(),
  url: z.string(),
})
export const accountingProviderConnectionDeletedSchema = z.strictObject({
  object: z.literal('accounting-provider-connection'),
  id: z.string(),
  deleted: z.literal(true),
})
export const accountingProviderAuthorizationSchema = z.strictObject({
  object: z.literal('accounting-provider-authorization'),
  connectionId: z.string(),
  authorizeUrl: z.string().url(),
  expiresAt: z.number().int(),
})
export const accountingProviderReconcileSchema = z.strictObject({
  object: z.literal('accounting-provider-reconcile'),
  connectionId: z.string(),
  resourceTypes: z.array(resourceTypeSchema),
  enqueued: z.number().int().nonnegative(),
})
export const accountingProviderImportCandidateSchema = z.strictObject({
  object: z.literal('accounting-provider-import-candidate'),
  resourceType: importResourceTypeSchema,
  externalId: z.string(),
  name: z.string(),
  secondary: z.string().nullable(),
  status: z.string().nullable(),
  mappedResourceId: z.string().nullable(),
})
export const accountingProviderImportListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(accountingProviderImportCandidateSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
  url: z.string(),
})
export const accountingProviderAdoptionSchema = z.strictObject({
  object: z.literal('accounting-provider-adoption'),
  connectionId: z.string(),
  resourceType: importResourceTypeSchema,
  resourceId: z.string(),
  externalId: z.string(),
})
export const accountingProviderAdoptionDeletedSchema = z.strictObject({
  object: z.literal('accounting-provider-adoption'),
  connectionId: z.string(),
  resourceType: importResourceTypeSchema,
  resourceId: z.string(),
  deleted: z.literal(true),
})
