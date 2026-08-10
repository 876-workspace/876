import 'server-only'

export { create876CouriersIntegrationClient } from './client'
export type { CouriersIntegrationClient } from './client'
export type { IntegrationClientOptions, Error, Result, List } from '../types'
export type { Tenant, TenantList } from './types/tenant.schema'
export { tenantSchema, tenantListSchema } from './types/tenant.schema'
