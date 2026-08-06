/**
 * OpenAPI prose for the Sessions module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

export const LIST_SESSIONS_SUMMARY = 'List sessions'

export const LIST_SESSIONS_DESCRIPTION = 'Lists platform sessions newest first.'

export const LIST_SESSIONS_RESPONSES = {} as const

export const RETRIEVE_SESSION_SUMMARY = 'Retrieve a session'

export const RETRIEVE_SESSION_DESCRIPTION =
  'Retrieves one session without credential material.'

export const RETRIEVE_SESSION_RESPONSES = {} as const

export const REVOKE_SESSION_SUMMARY = 'Revoke a session'

export const REVOKE_SESSION_DESCRIPTION = 'Soft-revokes one session.'

export const REVOKE_SESSION_RESPONSES = {} as const

export const REVOKE_USER_SESSIONS_SUMMARY = 'Revoke user sessions'

export const REVOKE_USER_SESSIONS_DESCRIPTION =
  'Soft-revokes every active session for a user.'

export const REVOKE_USER_SESSIONS_RESPONSES = {} as const
