/**
 * OpenAPI prose for the Audit Events module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

export const CREATE_AUDIT_EVENT_SUMMARY = 'Create audit event'

export const CREATE_AUDIT_EVENT_DESCRIPTION =
  'Records a sanitized first-party analytics or client telemetry event.'

export const CREATE_AUDIT_EVENT_RESPONSES = {
  201: { description: 'Audit event recorded.' },
  400: { description: 'Invalid event payload.' },
  401: { description: 'Missing or invalid API key.' },
} as const

export const LIST_AUDIT_EVENTS_SUMMARY = 'List audit events'

export const LIST_AUDIT_EVENTS_DESCRIPTION =
  'Returns queryable audit and analytics events for Console.'

export const LIST_AUDIT_EVENTS_RESPONSES = {
  200: { description: 'Audit events returned.' },
  401: { description: 'Missing API key or internal key.' },
  403: { description: 'The caller is not authorized to view audit events.' },
} as const
