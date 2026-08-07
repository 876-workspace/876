/**
 * OpenAPI prose for the Features module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

const _ADMIN = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
} as const

export const LIST_FEATURE_GRANTS_SUMMARY = 'List feature overrides'

export const LIST_FEATURE_GRANTS_DESCRIPTION = `
Returns all organization and user overrides attached to a specific feature flag, with identity details. **Admin only**.

This endpoint returns complete override lists without pagination (\`has_more\` is always \`false\`).
`

export const LIST_FEATURE_GRANTS_RESPONSES = {
  ..._ADMIN,
  404: { description: 'Feature not found.' },
} as const

export const LIST_FEATURES_DESCRIPTION = `
Returns a paginated list of all feature flags. **Admin only**.

Feature flags are created and managed directly via the API; PostHog is the provider catalog.
`

export const LIST_FEATURES_RESPONSES = { ..._ADMIN } as const

export const RETRIEVE_FEATURE_DESCRIPTION =
  'Returns a single feature flag by ID. **Admin only**.'

export const RETRIEVE_FEATURE_RESPONSES = {
  ..._ADMIN,
  404: { description: 'Feature not found.' },
} as const

export const UPDATE_FEATURE_DESCRIPTION = `
Updates a feature flag. **Admin only**.

Editable fields: \`description\`, \`enabled\`, \`scope\`, \`default_value\`, \`consumer_default_enabled\`, \`app_id\`.
Changes to \`enabled\` and \`description\` are also pushed to PostHog.
`

export const UPDATE_FEATURE_RESPONSES = {
  ..._ADMIN,
  404: { description: 'Feature not found.' },
  409: { description: 'Feature is not mapped to PostHog.' },
} as const

export const CREATE_FEATURE_SUMMARY = 'Create feature flag'

export const CREATE_FEATURE_DESCRIPTION =
  'Creates a new feature flag in PostHog and mirrors it locally. **Admin only**.'

export const CREATE_FEATURE_RESPONSES = {
  ..._ADMIN,
  201: { description: 'Feature flag created successfully.' },
  400: { description: 'Invalid request body.' },
  422: { description: 'Validation error.' },
} as const

export const DELETE_FEATURE_SUMMARY = 'Delete feature flag'

export const DELETE_FEATURE_DESCRIPTION =
  'Deletes the feature flag from PostHog and removes the local mirror. **Admin only**.'

export const DELETE_FEATURE_RESPONSES = {
  ..._ADMIN,
  204: { description: 'Feature flag deleted.' },
  404: { description: 'Feature not found.' },
  409: { description: 'Feature is not mapped to PostHog.' },
} as const

export const EVALUATE_FEATURES_SUMMARY = 'Evaluate feature flags'

export const EVALUATE_FEATURES_DESCRIPTION =
  'Resolves enabled feature flags for a user, organization, app, or combined context. Returns 876-normalized feature records and uses local feature state as the durable fallback. **Admin only**.'

export const EVALUATE_FEATURES_RESPONSES = {
  ..._ADMIN,
  404: { description: 'App, user, or organization not found.' },
} as const

export const GRANT_USER_FEATURE_SUMMARY = 'Grant feature to user'

export const GRANT_USER_FEATURE_DESCRIPTION =
  'Grants a feature flag override to a specific user in the local entitlement catalog. **Admin only**.'

export const GRANT_USER_FEATURE_RESPONSES = {
  ..._ADMIN,
  201: { description: 'Feature grant created or updated.' },
  404: { description: 'User or feature not found.' },
} as const

export const UPDATE_USER_FEATURE_SUMMARY = 'Update user feature grant'

export const UPDATE_USER_FEATURE_DESCRIPTION =
  'Updates an existing feature flag override for a specific user. **Admin only**.'

export const UPDATE_USER_FEATURE_RESPONSES = {
  ..._ADMIN,
  200: { description: 'Feature grant updated.' },
  404: { description: 'Grant not found.' },
} as const

export const REVOKE_USER_FEATURE_SUMMARY = 'Revoke feature from user'

export const REVOKE_USER_FEATURE_DESCRIPTION =
  'Removes a feature flag override from a specific user. **Admin only**.'

export const REVOKE_USER_FEATURE_RESPONSES = {
  ..._ADMIN,
  200: { description: 'Feature grant revoked.' },
  404: { description: 'Grant not found.' },
} as const

export const GRANT_ORG_FEATURE_SUMMARY = 'Grant feature to organization'

export const GRANT_ORG_FEATURE_DESCRIPTION =
  'Grants a feature flag override to a specific organization in the local entitlement catalog. **Admin only**.'

export const GRANT_ORG_FEATURE_RESPONSES = {
  ..._ADMIN,
  201: { description: 'Organization feature grant created or updated.' },
  404: { description: 'Organization or feature not found.' },
} as const

export const LIST_ORG_FEATURES_SUMMARY = 'List organization feature grants'

export const LIST_ORG_FEATURES_DESCRIPTION =
  'Returns all feature grants for an organization. **Admin only**.'

export const LIST_ORG_FEATURES_RESPONSES = {
  ..._ADMIN,
  404: { description: 'Organization not found.' },
} as const

export const REVOKE_ORG_FEATURE_SUMMARY = 'Revoke feature from organization'

export const REVOKE_ORG_FEATURE_DESCRIPTION =
  'Removes a feature flag override from a specific organization. **Admin only**.'

export const REVOKE_ORG_FEATURE_RESPONSES = {
  ..._ADMIN,
  200: { description: 'Organization feature grant revoked.' },
  404: { description: 'Grant not found.' },
} as const

export const UPDATE_ORG_FEATURE_SUMMARY = 'Update organization feature grant'

export const UPDATE_ORG_FEATURE_DESCRIPTION =
  'Updates an existing feature flag override for a specific organization. **Admin only**.'

export const UPDATE_ORG_FEATURE_RESPONSES = {
  ..._ADMIN,
  200: { description: 'Organization feature grant updated.' },
  404: { description: 'Grant not found.' },
} as const
