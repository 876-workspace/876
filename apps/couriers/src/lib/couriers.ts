import 'server-only'

import type {
  Address,
  Branch,
  CreateAddressBody,
  CreateBranchBody,
  CreateWarehouseBody,
  Customer,
  Error as CouriersError,
  Result,
  Role,
  TeamMember,
  Tenant,
  UpdateAddressBody,
  UpdateBranchBody,
  UpdateWarehouseBody,
  Warehouse,
} from '@876/couriers/admin'

import type { CouriersTenant } from '@/types/auth'
import type { CustomerView } from '@/types/customer'
import type {
  AddressCreateParams,
  AddressUpdateParams,
  AddressView,
} from '@/types/address'
import type {
  BranchCreateParams,
  BranchUpdateParams,
  BranchView,
} from '@/types/branch'
import type { RoleView } from '@/types/role'
import type { TeamMemberView } from '@/types/team'
import type {
  WarehouseCreateParams,
  WarehouseUpdateParams,
  WarehouseView,
} from '@/types/warehouse'

/**
 * Keep a Couriers service outage distinct from an empty result. Server
 * components should fail visibly so they do not make destructive decisions
 * (such as treating an unavailable list as a first-branch setup).
 */
export function requireCouriersData<T>(result: Result<T>): T {
  if (result.error === null) return result.data
  throw new Error(
    `Couriers request failed (${result.error.code}): ${result.error.message}`
  )
}

export function isCouriersNotFound(result: Result<unknown>): boolean {
  return result.error !== null && result.error.code.endsWith('/not-found')
}

/** Map the client-safe service code back to the status our same-origin BFF uses. */
export function couriersErrorStatus(error: CouriersError): number {
  if (error.code.endsWith('/not-found')) return 404
  if (
    error.code.endsWith('/conflict') ||
    error.code.endsWith('/in-use') ||
    error.code.endsWith('/already-exists')
  )
    return 409
  if (error.code === 'request/invalid') return 422
  if (error.code.endsWith('/unavailable')) return 503
  return 502
}

export function toCouriersTenant(tenant: Tenant): CouriersTenant {
  return {
    id: tenant.id,
    orgId: tenant.org_id,
    slug: tenant.slug,
    name: tenant.name,
    mailboxPrefix: tenant.mailbox_prefix,
    status: tenant.status,
    createdAt: tenant.created_at,
    updatedAt: tenant.updated_at,
  }
}

export function toAddressView(address: Address): AddressView {
  return {
    id: address.id,
    tenantId: address.tenant_id,
    name: address.name,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    regionCode: address.region_code,
    regionName: address.region_name,
    countryCode: address.country_code,
    postalCode: address.postal_code,
    latitude: address.latitude,
    longitude: address.longitude,
    isActive: address.is_active,
    createdAt: address.created_at,
    updatedAt: address.updated_at,
  }
}

export function toBranchView(branch: Branch): BranchView {
  return {
    id: branch.id,
    tenantId: branch.tenant_id,
    addressId: branch.address_id,
    orgLocationId: branch.org_location_id,
    name: branch.name,
    phone: branch.phone,
    isDefault: branch.is_default,
    isActive: branch.is_active,
    settings: branch.settings,
    address: toAddressView(branch.address),
    createdAt: branch.created_at,
    updatedAt: branch.updated_at,
  }
}

export function toWarehouseView(warehouse: Warehouse): WarehouseView {
  return {
    id: warehouse.id,
    tenantId: warehouse.tenant_id,
    addressId: warehouse.address_id,
    orgLocationId: warehouse.org_location_id,
    name: warehouse.name,
    operatingModel: warehouse.operating_model,
    agentName: warehouse.agent_name,
    code: warehouse.code,
    mailboxPlacement: warehouse.mailbox_placement,
    mailboxPrefix: warehouse.mailbox_prefix,
    instructions: warehouse.instructions,
    isActive: warehouse.is_active,
    isPrimary: warehouse.is_primary,
    address: toAddressView(warehouse.address),
    createdAt: warehouse.created_at,
    updatedAt: warehouse.updated_at,
  }
}

export function toAddressCreateBody(
  input: AddressCreateParams
): CreateAddressBody {
  return {
    name: input.name,
    line1: input.line1,
    ...(input.line2 === undefined ? {} : { line2: input.line2 }),
    city: input.city,
    country_code: input.countryCode,
    ...(input.regionCode === undefined
      ? {}
      : { region_code: input.regionCode }),
    ...(input.postalCode === undefined
      ? {}
      : { postal_code: input.postalCode }),
    ...(input.latitude === undefined ? {} : { latitude: input.latitude }),
    ...(input.longitude === undefined ? {} : { longitude: input.longitude }),
    ...(input.isActive === undefined ? {} : { is_active: input.isActive }),
  }
}

export function toAddressUpdateBody(
  input: AddressUpdateParams
): UpdateAddressBody {
  return {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.line1 === undefined ? {} : { line1: input.line1 }),
    ...(input.line2 === undefined ? {} : { line2: input.line2 }),
    ...(input.city === undefined ? {} : { city: input.city }),
    ...(input.countryCode === undefined
      ? {}
      : { country_code: input.countryCode }),
    ...(input.regionCode === undefined
      ? {}
      : { region_code: input.regionCode }),
    ...(input.postalCode === undefined
      ? {}
      : { postal_code: input.postalCode }),
    ...(input.latitude === undefined ? {} : { latitude: input.latitude }),
    ...(input.longitude === undefined ? {} : { longitude: input.longitude }),
    ...(input.isActive === undefined ? {} : { is_active: input.isActive }),
  }
}

export function toBranchCreateBody(
  input: BranchCreateParams
): CreateBranchBody {
  return {
    name: input.name,
    ...(input.phone === undefined ? {} : { phone: input.phone }),
    ...(input.isDefault === undefined ? {} : { is_default: input.isDefault }),
    ...(input.isActive === undefined ? {} : { is_active: input.isActive }),
    ...(input.settings === undefined ? {} : { settings: input.settings }),
    address: toAddressCreateBody(input.address),
  }
}

export function toBranchUpdateBody(
  input: BranchUpdateParams
): UpdateBranchBody {
  return {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.phone === undefined ? {} : { phone: input.phone }),
    ...(input.isDefault === undefined ? {} : { is_default: input.isDefault }),
    ...(input.isActive === undefined ? {} : { is_active: input.isActive }),
    ...(input.settings === undefined ? {} : { settings: input.settings }),
    ...(input.address === undefined
      ? {}
      : { address: toAddressUpdateBody(input.address) }),
  }
}

export function toWarehouseCreateBody(
  input: WarehouseCreateParams
): CreateWarehouseBody {
  return {
    name: input.name,
    ...(input.operatingModel === undefined
      ? {}
      : { operating_model: input.operatingModel }),
    ...(input.agentName === undefined ? {} : { agent_name: input.agentName }),
    ...(input.code === undefined ? {} : { code: input.code }),
    ...(input.mailboxPlacement === undefined
      ? {}
      : { mailbox_placement: input.mailboxPlacement }),
    ...(input.mailboxPrefix === undefined
      ? {}
      : { mailbox_prefix: input.mailboxPrefix }),
    ...(input.instructions === undefined
      ? {}
      : { instructions: input.instructions }),
    ...(input.isActive === undefined ? {} : { is_active: input.isActive }),
    ...(input.isPrimary === undefined ? {} : { is_primary: input.isPrimary }),
    address: toAddressCreateBody(input.address),
  }
}

export function toWarehouseUpdateBody(
  input: WarehouseUpdateParams
): UpdateWarehouseBody {
  return {
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.operatingModel === undefined
      ? {}
      : { operating_model: input.operatingModel }),
    ...(input.agentName === undefined ? {} : { agent_name: input.agentName }),
    ...(input.code === undefined ? {} : { code: input.code }),
    ...(input.mailboxPlacement === undefined
      ? {}
      : { mailbox_placement: input.mailboxPlacement }),
    ...(input.mailboxPrefix === undefined
      ? {}
      : { mailbox_prefix: input.mailboxPrefix }),
    ...(input.instructions === undefined
      ? {}
      : { instructions: input.instructions }),
    ...(input.isActive === undefined ? {} : { is_active: input.isActive }),
    ...(input.isPrimary === undefined ? {} : { is_primary: input.isPrimary }),
    ...(input.address === undefined
      ? {}
      : { address: toAddressUpdateBody(input.address) }),
  }
}

export function toRoleView(role: Role): RoleView {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    isDefault: role.is_default,
    systemKey: role.system_key,
    memberCount: role.member_count,
    createdAt: role.created_at,
    updatedAt: role.updated_at,
  }
}

export function toTeamMemberView(member: TeamMember): TeamMemberView {
  return {
    id: member.id,
    userId: member.user_id,
    roleId: member.role_id,
    roleName: member.role_name,
    roleSystemKey: member.role_system_key,
    status: member.status,
    createdAt: member.created_at,
    updatedAt: member.updated_at,
  }
}

export function toCustomerView(customer: Customer): CustomerView {
  return {
    id: customer.id,
    tenantId: customer.tenant_id,
    userId: customer.user_id,
    billingCustomerId: customer.billing_customer_id,
    branchId: customer.branch_id,
    status: customer.status,
    trn: customer.trn,
    isCommercial: customer.is_commercial,
    firstSeenAt: customer.first_seen_at,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at,
  }
}
