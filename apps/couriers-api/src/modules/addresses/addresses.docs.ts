export const LIST_SUMMARY = 'List a tenant’s addresses'
export const LIST_DESCRIPTION =
  'Returns physical locations owned by the tenant. Admin only.'
export const CREATE_SUMMARY = 'Create a tenant address'
export const CREATE_DESCRIPTION =
  'Creates a tenant-owned address after resolving its canonical geographic region.'
export const RETRIEVE_SUMMARY = 'Retrieve a tenant address'
export const UPDATE_SUMMARY = 'Update a tenant address'
export const DELETE_SUMMARY = 'Delete an unused tenant address'

export const RESPONSES = {
  200: { description: 'Address returned.' },
  201: { description: 'Address created.' },
  404: { description: 'Address or tenant not found.' },
  409: { description: 'Address is still in use.' },
  422: { description: 'Invalid address input.' },
  503: { description: 'Geographic validation is unavailable.' },
} as const
