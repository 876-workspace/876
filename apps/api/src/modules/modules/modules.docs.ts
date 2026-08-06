/**
 * OpenAPI prose for the Modules module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

export const CREATE_MODULE_SUMMARY = 'Create an application module'

export const CREATE_MODULE_DESCRIPTION =
  'Creates a stable module. An optional root feature flag can act as its operational rollout or kill switch.'

export const EVALUATE_MODULES_SUMMARY = 'List organization module entitlements'

export const EVALUATE_MODULES_DESCRIPTION = `Returns active modules granted by the organization's active or trialing plan for the selected application.`

export const LIST_MODULES_SUMMARY = 'List application modules'

export const LIST_MODULES_DESCRIPTION =
  'Lists durable commercial capabilities for an application. Modules are plan entitlements; feature flags remain operational rollout controls.'

export const UPDATE_MODULE_SUMMARY = 'Update an application module'

export const UPDATE_MODULE_DESCRIPTION =
  'Updates module metadata, ordering, rollout flag, or archive state.'
