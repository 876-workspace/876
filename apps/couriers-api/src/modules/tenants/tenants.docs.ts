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
