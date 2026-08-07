/**
 * OpenAPI prose for the Communications module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

export const CREATE_MESSAGE_SUMMARY = 'Create transactional message'

export const CREATE_MESSAGE_DESCRIPTION =
  'Sends a registered server-owned template over an enabled communications channel.'

export const CREATE_MESSAGE_RESPONSES = {
  201: { description: 'Message created.' },
} as const

export const CREATE_CALL_SUMMARY = 'Create outbound voice call'

export const CREATE_CALL_DESCRIPTION =
  'Places a call using a registered server-owned voice template.'

export const CREATE_CALL_RESPONSES = {
  201: { description: 'Call created.' },
} as const

export const CREATE_PHONE_LOOKUP_SUMMARY = 'Look up a phone number'

export const CREATE_PHONE_LOOKUP_DESCRIPTION =
  'Validates and formats a phone number through the configured provider, using the cost-control cache.'

export const CREATE_PHONE_LOOKUP_RESPONSES = {
  200: { description: 'Phone lookup returned.' },
} as const

export const LIST_MESSAGES_SUMMARY = 'List communications messages'

export const LIST_MESSAGES_DESCRIPTION =
  'Returns server-owned message delivery records without full bodies.'

export const LIST_MESSAGES_RESPONSES = {
  200: { description: 'Messages returned.' },
} as const

export const LIST_CALLS_SUMMARY = 'List communications calls'

export const LIST_CALLS_DESCRIPTION =
  'Returns server-owned outbound voice call records.'

export const LIST_CALLS_RESPONSES = {
  200: { description: 'Calls returned.' },
} as const

export const RETRIEVE_MESSAGE_SUMMARY = 'Retrieve communications message'

export const RETRIEVE_MESSAGE_DESCRIPTION =
  'Returns a message delivery record without its full body.'

export const RETRIEVE_MESSAGE_RESPONSES = {
  200: { description: 'Message returned.' },
} as const

export const RETRIEVE_CALL_SUMMARY = 'Retrieve communications call'

export const RETRIEVE_CALL_DESCRIPTION =
  'Returns an outbound voice call record.'

export const RETRIEVE_CALL_RESPONSES = {
  200: { description: 'Call returned.' },
} as const
