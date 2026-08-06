/**
 * OpenAPI prose for the Devices module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

export const LIST_DEVICES_SUMMARY = 'List devices'

export const LIST_DEVICES_DESCRIPTION =
  'Lists derived device identities captured during authentication.'

export const LIST_DEVICES_RESPONSES = {} as const

export const RETRIEVE_DEVICE_SUMMARY = 'Retrieve a device'

export const RETRIEVE_DEVICE_DESCRIPTION =
  'Retrieves one derived device identity.'

export const RETRIEVE_DEVICE_RESPONSES = {} as const

export const UPDATE_DEVICE_SUMMARY = 'Update a device'

export const UPDATE_DEVICE_DESCRIPTION =
  'Updates a device label, trust, or block status.'

export const UPDATE_DEVICE_RESPONSES = {} as const

export const LIST_DEVICE_ATTEMPTS_SUMMARY = 'List device attempts'

export const LIST_DEVICE_ATTEMPTS_DESCRIPTION =
  'Lists authentication attempts for a device.'

export const LIST_DEVICE_ATTEMPTS_RESPONSES = {} as const

export const LIST_DEVICE_USERS_SUMMARY = 'List device users'

export const LIST_DEVICE_USERS_DESCRIPTION =
  'Lists accounts observed on the same fingerprint.'

export const LIST_DEVICE_USERS_RESPONSES = {} as const
