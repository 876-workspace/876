/**
 * OpenAPI prose for the Addresses module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

export const LIST_ADDRESSES_SUMMARY = 'List addresses'

export const LIST_ADDRESSES_DESCRIPTION =
  'Returns addresses for a user or organization. Exactly one of `userId` or `organizationId` must be provided.'

export const LIST_ADDRESSES_RESPONSES = {
  200: { description: 'Address list returned.' },
  400: { description: 'Neither or both owner params provided.' },
} as const

export const CREATE_ADDRESS_SUMMARY = 'Create address'

export const CREATE_ADDRESS_DESCRIPTION =
  'Creates a new address for a user or organization.'

export const CREATE_ADDRESS_RESPONSES = {
  201: { description: 'Address created.' },
  400: { description: 'Invalid owner or address type.' },
} as const

export const RETRIEVE_ADDRESS_SUMMARY = 'Retrieve address'

export const RETRIEVE_ADDRESS_DESCRIPTION = 'Retrieves a single address by ID.'

export const RETRIEVE_ADDRESS_RESPONSES = {
  200: { description: 'Address returned.' },
  404: { description: 'Address not found.' },
} as const

export const UPDATE_ADDRESS_SUMMARY = 'Update address'

export const UPDATE_ADDRESS_DESCRIPTION = 'Updates an existing address.'

export const UPDATE_ADDRESS_RESPONSES = {
  200: { description: 'Address updated.' },
  404: { description: 'Address not found.' },
} as const

export const DELETE_ADDRESS_SUMMARY = 'Delete address'

export const DELETE_ADDRESS_DESCRIPTION = 'Permanently deletes an address.'

export const DELETE_ADDRESS_RESPONSES = {
  200: { description: 'Address deleted.' },
  404: { description: 'Address not found.' },
} as const
