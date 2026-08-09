export const LIST_SUMMARY = 'List a tenant’s branches'
export const LIST_DESCRIPTION =
  'Returns tenant-owned operational pickup locations. Admin only.'
export const CREATE_SUMMARY = 'Create a tenant branch'
export const CREATE_DESCRIPTION =
  'Creates a branch and its address atomically. Geographic names are resolved by the platform catalog.'
export const RETRIEVE_SUMMARY = 'Retrieve a tenant branch'
export const UPDATE_SUMMARY = 'Update a tenant branch'
export const RESPONSES = {
  200: { description: 'Branch returned.' },
  201: { description: 'Branch created.' },
  404: { description: 'Branch not found.' },
  409: { description: 'Branch invariant or name conflict.' },
  422: { description: 'Invalid branch or address input.' },
  503: { description: 'Geographic validation is unavailable.' },
} as const
