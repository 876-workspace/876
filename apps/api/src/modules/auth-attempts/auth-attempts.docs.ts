/**
 * OpenAPI prose for the Auth Attempts module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

export const LIST_AUTH_ATTEMPTS_SUMMARY = 'List authentication attempts'

export const LIST_AUTH_ATTEMPTS_DESCRIPTION =
  'Lists authentication attempts newest first.'

export const LIST_AUTH_ATTEMPTS_RESPONSES = {} as const

export const RETRIEVE_AUTH_ATTEMPT_SUMMARY =
  'Retrieve an authentication attempt'

export const RETRIEVE_AUTH_ATTEMPT_DESCRIPTION =
  'Retrieves one authentication attempt.'

export const RETRIEVE_AUTH_ATTEMPT_RESPONSES = {} as const

export const RETRIEVE_AUTH_ATTEMPT_SUMMARY_SUMMARY =
  'Summarize authentication attempts'

export const RETRIEVE_AUTH_ATTEMPT_SUMMARY_DESCRIPTION =
  'Returns SQL aggregates for a bounded dashboard window.'

export const RETRIEVE_AUTH_ATTEMPT_SUMMARY_RESPONSES = {} as const
