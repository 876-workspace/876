import 'server-only'

export { create876CouriersAdminClient } from './client'
export type { CouriersAdminClient } from './client'
export type { AdminClientOptions, Error, Result, List } from '../types'
export type { Tenant, TenantList } from './types/tenant.schema'
export { tenantSchema, tenantListSchema } from './types/tenant.schema'
export type { Branch, BranchList } from './types/branch.schema'
export { branchSchema, branchListSchema } from './types/branch.schema'
