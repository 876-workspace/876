export const LIST_SUMMARY = 'List a customer’s addresses'
export const LIST_DESCRIPTION =
  'Returns the tenant-scoped addresses associated with one customer. Admin only.'
export const CREATE_SUMMARY = 'Create a customer address'
export const CREATE_DESCRIPTION =
  'Creates a physical address and assigns it to the customer in one role.'
export const RETRIEVE_SUMMARY = 'Retrieve a customer address'
export const UPDATE_SUMMARY = 'Update a customer address'
export const DELETE_SUMMARY = 'Remove a customer address'

export const RESPONSES = {
  200: { description: 'Customer address returned.' },
  201: { description: 'Customer address created.' },
  404: { description: 'Customer or customer address not found.' },
  409: { description: 'Customer address conflicts with an existing role.' },
  422: { description: 'Invalid customer address input.' },
  503: { description: 'Geographic validation is unavailable.' },
} as const
