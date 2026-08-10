export const RETRIEVE_TENANT_SUMMARY = 'Retrieve a tenant by ID'
export const RETRIEVE_TENANT_DESCRIPTION =
  'Returns a tenant identified by its couriers tenant ID.'
export const RETRIEVE_TENANT_RESPONSES = {
  200: { description: 'Tenant returned.' },
  404: { description: 'Tenant not found.' },
} as const

export const RETRIEVE_TENANT_BY_ORG_SUMMARY =
  'Retrieve a tenant by organization ID'
export const RETRIEVE_TENANT_BY_ORG_DESCRIPTION =
  'Returns the tenant that owns the given 876 organization ID.'
export const RETRIEVE_TENANT_BY_ORG_RESPONSES = {
  200: { description: 'Tenant returned.' },
  404: { description: 'Tenant not found.' },
} as const

export const LIST_TENANTS_SUMMARY = 'List all tenants'
export const LIST_TENANTS_DESCRIPTION = 'Returns all tenants. Admin only.'
export const LIST_TENANTS_RESPONSES = {
  200: { description: 'Tenants returned.' },
} as const

export const CREATE_TENANT_SUMMARY = 'Create a tenant'
export const CREATE_TENANT_DESCRIPTION =
  'Provisions a tenant with its verified default subdomain and system roles. Admin only.'
export const CREATE_TENANT_RESPONSES = {
  201: { description: 'Tenant created.' },
  409: { description: 'Organization or subdomain already has a tenant.' },
} as const

export const UPDATE_TENANT_SUMMARY = 'Update a tenant'
export const UPDATE_TENANT_DESCRIPTION =
  'Updates mutable tenant settings. Admin only.'
export const UPDATE_TENANT_RESPONSES = {
  200: { description: 'Tenant updated.' },
  404: { description: 'Tenant not found.' },
} as const
