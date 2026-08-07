/**
 * OpenAPI prose for the Apps module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

export const GET_APP_PUBLIC_SUMMARY = 'Get public app info'

export const GET_APP_PUBLIC_DESCRIPTION =
  'Returns public-safe branding information (name, logo) for a registered app identified by client_id. Used by the login page to display app context.'

export const GET_APP_PUBLIC_RESPONSES = {
  200: { description: 'App public info returned.' },
  404: { description: 'App not found.' },
} as const

export const CREATE_API_KEY_SUMMARY = 'Create an API key'

export const CREATE_API_KEY_DESCRIPTION = `
Creates a new API key for the app. The plaintext key is returned **once** — store it securely.
`

export const CREATE_API_KEY_RESPONSES = {
  404: { description: 'App not found.' },
} as const

export const CREATE_APP_SUMMARY = 'Create an app'

export const CREATE_APP_DESCRIPTION = `
Registers a new application. **Admin only** — including when \`organizationId\`
is supplied, because this route has no session principal and so cannot
establish that the caller may act for the organization it names.

* For \`confidential\` clients: generates a \`clientSecret\` returned **once** in
  the response. Store it securely — it cannot be retrieved again.
* Validates each \`redirect_uri\` for safety.
* Defaults \`scopes_allowed\` to \`["openid", "profile", "email"]\` if omitted.
* Set \`appKind\` to \`"internal"\` for first-party 876 applications. A first-party
  kind suppresses the OAuth consent screen, which is why it may only be chosen
  by an admin caller.

The \`client_id\` is auto-generated.
`

export const CREATE_APP_RESPONSES = {
  400: { description: 'Invalid scope or unsafe redirect URI.' },
  401: { description: 'No admin credential presented.' },
  403: { description: 'The principal is not an admin.' },
} as const

export const DELETE_API_KEY_SUMMARY = 'Delete an API key'

export const DELETE_API_KEY_DESCRIPTION =
  'Deletes an API key for an app. Returns a deletion tombstone. **Admin only**.'

export const DELETE_API_KEY_RESPONSES = {
  404: { description: 'API key not found.' },
} as const

export const DELETE_APP_SUMMARY = 'Delete an app'

export const DELETE_APP_DESCRIPTION =
  'Deletes a registered app. Returns a deletion tombstone. **Admin only**.'

export const DELETE_APP_RESPONSES = {
  404: { description: 'App not found.' },
} as const

export const LIST_API_KEYS_SUMMARY = 'List API keys for an app'

export const LIST_API_KEYS_DESCRIPTION =
  'Returns a paginated list of API keys for an app. **Admin only**.'

export const LIST_API_KEYS_RESPONSES = {
  404: { description: 'App not found.' },
} as const

export const LIST_APP_FEATURES_SUMMARY = 'List features for an app'

export const LIST_APP_FEATURES_DESCRIPTION =
  'Returns a paginated list of feature flags assigned to this app. **Admin only**.'

export const LIST_APP_FEATURES_RESPONSES = {
  404: { description: 'App not found.' },
} as const

export const LIST_APP_SUBSCRIPTIONS_SUMMARY = 'List subscriptions for an app'

export const LIST_APP_SUBSCRIPTIONS_DESCRIPTION = `Returns every organization's access/subscription record for this app, newest first. **Admin only**.`

export const LIST_APP_SUBSCRIPTIONS_RESPONSES = {
  404: { description: 'App not found.' },
} as const

export const LIST_APPS_SUMMARY = 'List apps'

export const LIST_APPS_DESCRIPTION = `
Returns a paginated list of apps. Filter by \`organizationId\`,
or \`status\`.
`

export const LIST_APPS_RESPONSES = {
  400: { description: '`organizationId` query parameter is required.' },
} as const

export const RETRIEVE_CURRENT_APP_SUMMARY = 'Retrieve current app'

export const RETRIEVE_CURRENT_APP_DESCRIPTION = `
Returns the registered app associated with the API key used on the request.

This is useful for first-party server flows that already hold their app API key
and need the app's OAuth metadata, such as \`client_id\`, without copying another
environment variable.
`

export const RETRIEVE_CURRENT_APP_RESPONSES = {
  404: { description: 'App not found.' },
} as const

export const RETRIEVE_APP_SUMMARY = 'Retrieve an app'

export const RETRIEVE_APP_DESCRIPTION = 'Returns a single registered app by ID.'

export const RETRIEVE_APP_RESPONSES = {
  404: { description: 'App not found.' },
} as const

export const UPDATE_API_KEY_SUMMARY = 'Update an API key'

export const UPDATE_API_KEY_DESCRIPTION =
  'Updates mutable fields (name) for an API key. **Admin only**.'

export const UPDATE_API_KEY_RESPONSES = {
  404: { description: 'API key not found.' },
} as const

export const REVOKE_API_KEY_SUMMARY = 'Revoke an API key'

export const REVOKE_API_KEY_DESCRIPTION =
  'Revokes an API key for an app. **Admin only**.'

export const REVOKE_API_KEY_RESPONSES = {
  404: { description: 'API key not found.' },
} as const

export const UPDATE_APP_SUMMARY = 'Update an app'

export const UPDATE_APP_DESCRIPTION =
  'Updates a registered app. **Admin only**.'

export const UPDATE_APP_RESPONSES = {
  400: { description: 'No fields to update.' },
  404: { description: 'App not found.' },
} as const
