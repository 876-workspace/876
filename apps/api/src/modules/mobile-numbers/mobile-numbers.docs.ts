/**
 * OpenAPI prose for the Mobile Numbers module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

export const APPROVE_VERIFICATION_SUMMARY = 'Approve mobile number verification'

export const APPROVE_VERIFICATION_DESCRIPTION = `Checks a provider-owned code for the authenticated user's mobile number.`

export const APPROVE_VERIFICATION_RESPONSES = {
  200: { description: 'Verification approved.' },
} as const

export const CREATE_MOBILE_NUMBER_SUMMARY = 'Create mobile number'

export const CREATE_MOBILE_NUMBER_DESCRIPTION = `Adds an E.164 mobile number to the authenticated user's account.`

export const CREATE_MOBILE_NUMBER_RESPONSES = {
  201: { description: 'Mobile number created.' },
} as const

export const CREATE_VERIFICATION_SUMMARY = 'Send mobile number verification'

export const CREATE_VERIFICATION_DESCRIPTION = `Creates a provider-owned verification challenge for the user's mobile number.`

export const CREATE_VERIFICATION_RESPONSES = {
  201: { description: 'Verification sent.' },
} as const

export const DELETE_MOBILE_NUMBER_SUMMARY = 'Delete mobile number'

export const DELETE_MOBILE_NUMBER_DESCRIPTION = `Deletes one of the authenticated user's mobile numbers.`

export const DELETE_MOBILE_NUMBER_RESPONSES = {
  200: { description: 'Mobile number deleted.' },
} as const

export const LIST_MOBILE_NUMBERS_SUMMARY = 'List mobile numbers'

export const LIST_MOBILE_NUMBERS_DESCRIPTION =
  'Lists mobile numbers belonging to the authenticated user.'

export const LIST_MOBILE_NUMBERS_RESPONSES = {
  200: { description: 'Mobile numbers returned.' },
} as const

export const MAKE_PRIMARY_SUMMARY = 'Make mobile number primary'

export const MAKE_PRIMARY_DESCRIPTION = `Makes a verified mobile number the user's primary number.`

export const MAKE_PRIMARY_RESPONSES = {
  200: { description: 'Primary number updated.' },
} as const

export const RETRIEVE_MOBILE_NUMBER_SUMMARY = 'Retrieve mobile number'

export const RETRIEVE_MOBILE_NUMBER_DESCRIPTION =
  'Returns one mobile number belonging to the authenticated user.'

export const RETRIEVE_MOBILE_NUMBER_RESPONSES = {
  200: { description: 'Mobile number returned.' },
} as const

export const UPDATE_MOBILE_NUMBER_SUMMARY = 'Update mobile number'

export const UPDATE_MOBILE_NUMBER_DESCRIPTION = `Updates metadata for one of the authenticated user's mobile numbers.`

export const UPDATE_MOBILE_NUMBER_RESPONSES = {
  200: { description: 'Mobile number updated.' },
} as const
