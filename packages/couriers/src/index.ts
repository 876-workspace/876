export { create876CouriersClient } from './client'
export type { CouriersClient } from './client'
export type {
  ClientOptions,
  Error,
  Result,
  List,
  RequestOptions,
} from './types'
export type { Tenant, TenantList } from './types/tenant.schema'
export { tenantSchema, tenantListSchema } from './types/tenant.schema'
export type {
  PortalPackage,
  PortalPackageList,
  PortalPackageStatus,
} from './types/portal-package.schema'
export type { PortalCustomer } from './types/portal-customer.schema'
export { portalCustomerSchema } from './types/portal-customer.schema'
export {
  portalPackageListSchema,
  portalPackageSchema,
  portalPackageStatusSchema,
} from './types/portal-package.schema'
export type { ListPortalPackagesParams } from './resources/portal'
