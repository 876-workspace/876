import 'server-only'

export { create876CouriersAdminClient } from './client'
export type { CouriersAdminClient } from './client'
export type { AdminClientOptions, Error, Result, List } from '../types'
export type {
  CreateTenantBody,
  Tenant,
  TenantList,
  UpdateTenantBody,
} from './types/tenant.schema'
export {
  createTenantBodySchema,
  tenantSchema,
  tenantListSchema,
  updateTenantBodySchema,
} from './types/tenant.schema'
export type { Branch, BranchList } from './types/branch.schema'
export type { CreateBranchBody, UpdateBranchBody } from './types/branch.schema'
export {
  branchSchema,
  branchListSchema,
  createBranchBodySchema,
  updateBranchBodySchema,
} from './types/branch.schema'
export type {
  CreateRoleBody,
  DeletedRole,
  Role,
  RoleList,
  UpdateRoleBody,
} from './types/role.schema'
export {
  deletedRoleSchema,
  roleListSchema,
  roleSchema,
} from './types/role.schema'
export type {
  CreateTeamMemberBody,
  DeletedTeamMember,
  ListTeamMembersParams,
  TeamMember,
  TeamMemberList,
  UpdateTeamMemberBody,
} from './types/team.schema'
export {
  deletedTeamMemberSchema,
  teamMemberListSchema,
  teamMemberSchema,
} from './types/team.schema'
export type {
  Address,
  AddressList,
  DeletedAddress,
  CreateAddressBody,
  UpdateAddressBody,
  ListAddressesParams,
} from './types/address.schema'
export {
  addressSchema,
  addressListSchema,
  deletedAddressSchema,
  createAddressBodySchema,
  updateAddressBodySchema,
} from './types/address.schema'
export type {
  CustomerAddress,
  CustomerAddressList,
  DeletedCustomerAddress,
  CustomerAddressType,
  CreateCustomerAddressBody,
  UpdateCustomerAddressBody,
  ListCustomerAddressesParams,
} from './types/customer-address.schema'
export {
  customerAddressSchema,
  customerAddressListSchema,
  deletedCustomerAddressSchema,
  customerAddressTypeSchema,
  createCustomerAddressBodySchema,
  updateCustomerAddressBodySchema,
} from './types/customer-address.schema'
export type {
  CreatePackageCategoryBody,
  DeletedPackageCategory,
  ListPackageCategoriesParams,
  PackageCategory,
  PackageCategoryList,
  UpdatePackageCategoryBody,
} from './types/package-category.schema'
export {
  createPackageCategoryBodySchema,
  deletedPackageCategorySchema,
  packageCategoryListSchema,
  packageCategorySchema,
  updatePackageCategoryBodySchema,
} from './types/package-category.schema'
export type {
  CreatePackageBody,
  ListPackagesParams,
  Package,
  PackageList,
  PackageStatus,
  UpdatePackageBody,
} from './types/package.schema'
export {
  createPackageBodySchema,
  packageListSchema,
  packageSchema,
  updatePackageBodySchema,
} from './types/package.schema'
export type {
  Warehouse,
  WarehouseList,
  CreateWarehouseBody,
  UpdateWarehouseBody,
} from './types/warehouse.schema'
export {
  warehouseSchema,
  warehouseListSchema,
  createWarehouseBodySchema,
  updateWarehouseBodySchema,
} from './types/warehouse.schema'
export type {
  ListMailboxesParams,
  Mailbox,
  MailboxAllocation,
  MailboxList,
} from './types/mailbox.schema'
export {
  mailboxAllocationSchema,
  mailboxListSchema,
  mailboxSchema,
} from './types/mailbox.schema'
export type {
  CreateCustomerBody,
  CustomerEnrollment,
  CustomerEnrollmentBody,
  Customer,
  CustomerList,
  CustomerStatus,
  DeleteCustomerBody,
  DeletedCustomer,
  ListCustomersParams,
  UpdateCustomerBody,
} from './types/customer.schema'
export {
  createCustomerBodySchema,
  customerEnrollmentBodySchema,
  customerEnrollmentSchema,
  customerListSchema,
  customerSchema,
  deleteCustomerBodySchema,
  deletedCustomerSchema,
  updateCustomerBodySchema,
} from './types/customer.schema'
export type {
  ModuleKey,
  ModulePreferences,
  OrganizationModule,
  OrganizationModuleList,
  ToggleModuleBody,
  UpdateModulePreferencesBody,
} from './types/settings.schema'
export type {
  OrganizationLocationReconciliation,
  SyncOrganizationLocationBody,
} from './types/organization-location.schema'
export {
  organizationLocationReconciliationSchema,
  organizationLocationSiteKindSchema,
  syncOrganizationLocationBodySchema,
} from './types/organization-location.schema'
export {
  moduleKeySchema,
  modulePreferencesSchema,
  organizationModuleListSchema,
  organizationModuleSchema,
  toggleModuleBodySchema,
  updateModulePreferencesBodySchema,
} from './types/settings.schema'
