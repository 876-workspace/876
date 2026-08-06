/**
 * OpenAPI prose for the Users module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

export const BACKFILL_USERNAMES_SUMMARY = 'Backfill usernames from email prefix'

export const BACKFILL_USERNAMES_DESCRIPTION =
  'Assigns usernames to users that do not have one. **Admin only**.'

export const BACKFILL_USERNAMES_RESPONSES = {} as const

export const BAN_USER_SUMMARY = 'Ban user'

export const BAN_USER_DESCRIPTION =
  'Bans a user, blocking every authentication path (password, social, OTP, and token refresh) and revoking all of their active sessions immediately. Reversible via unban. **Admin only**.'

export const BAN_USER_RESPONSES = {
  404: { description: 'No user found with this ID.' },
} as const

export const CREATE_USER_SUMMARY = 'Create user'

export const CREATE_USER_DESCRIPTION = 'Creates a user. **Admin only**.'

export const CREATE_USER_RESPONSES = {
  409: { description: 'Email or provider identity already exists.' },
} as const

export const CREATE_MY_ADDRESS_SUMMARY = 'Create my address'

export const CREATE_MY_ADDRESS_DESCRIPTION =
  'Creates an address for the current consumer user.'

export const CREATE_MY_ADDRESS_RESPONSES = {} as const

export const CREATE_MY_CONTACT_SUMMARY = 'Create my contact'

export const CREATE_MY_CONTACT_DESCRIPTION =
  'Saves another consumer user as a one-way contact for the current user.'

export const CREATE_MY_CONTACT_RESPONSES = {
  400: { description: 'The contact is invalid or already exists.' },
  404: { description: 'The target user does not exist.' },
} as const

export const DELETE_USER_SUMMARY = 'Delete user'

export const DELETE_USER_DESCRIPTION =
  'Deletes a user. Returns a deletion tombstone. **Admin only**.'

export const DELETE_USER_RESPONSES = {
  404: { description: 'No user found with this ID.' },
} as const

export const DELETE_MY_ADDRESS_SUMMARY = 'Delete my address'

export const DELETE_MY_ADDRESS_DESCRIPTION =
  'Deletes an address owned by the current consumer user.'

export const DELETE_MY_ADDRESS_RESPONSES = {
  404: { description: 'Address not found.' },
} as const

export const DELETE_MY_CONTACT_SUMMARY = 'Delete my contact'

export const DELETE_MY_CONTACT_DESCRIPTION =
  'Deletes a saved contact owned by the current consumer user.'

export const DELETE_MY_CONTACT_RESPONSES = {
  404: { description: 'Contact not found.' },
} as const

export const DISABLE_USER_FEATURE_SUMMARY = 'Disable user feature'

export const DISABLE_USER_FEATURE_DESCRIPTION = `
Disables a feature flag for a specific user.

Marks the local entitlement grant as \`disabled\`.

**Admin only**.
`

export const DISABLE_USER_FEATURE_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
  404: { description: 'User or feature not found.' },
} as const

export const ENSURE_USER_SUMMARY = 'Ensure user exists'

export const ENSURE_USER_DESCRIPTION = `
Idempotently creates or returns a user by WorkOS ID.

Called by the consumer app's auth middleware after WorkOS authentication to
ensure a local user record exists. Creates the user with a default \`consumer\`
account type and \`active\` status if not found.
`

export const ENSURE_USER_RESPONSES = {
  400: { description: 'Missing required fields.' },
} as const

export const GET_BY_USERNAME_SUMMARY = 'Retrieve user by username'

export const GET_BY_USERNAME_DESCRIPTION =
  'Returns a single user by username. **Admin only**.'

export const GET_BY_USERNAME_RESPONSES = {
  404: { description: 'No user found with this username.' },
} as const

export const GET_BY_WORKOS_ID_SUMMARY = 'Retrieve user by WorkOS ID'

export const GET_BY_WORKOS_ID_DESCRIPTION = `
Looks up a local user record by WorkOS user ID.

Used by the consumer app's auth callback to resolve the local user after
WorkOS authentication. No bearer token is required (server-to-server).
`

export const GET_BY_WORKOS_ID_RESPONSES = {
  404: { description: 'No user found with this WorkOS ID.' },
} as const

export const GRANT_USER_FEATURE_SUMMARY = 'Grant user feature'

export const GRANT_USER_FEATURE_DESCRIPTION = `
Grants a feature flag to a specific user.

* Validates that the feature scope is compatible with the user's account type.
* Upserts the local \`user_features\` record.

**Admin only**.
`

export const GRANT_USER_FEATURE_RESPONSES = {
  400: {
    description: `Feature scope is incompatible with the user's account type.`,
  },
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
  404: { description: 'User or feature not found.' },
} as const

export const LIST_OAUTH_GRANTS_SUMMARY = 'List user OAuth grants'

export const LIST_OAUTH_GRANTS_DESCRIPTION = `
Returns all active OAuth grants for a user — the third-party apps the user
has authorized via the consent flow.
`

export const LIST_OAUTH_GRANTS_RESPONSES = {
  400: { description: '`userId` path parameter is required.' },
} as const

export const LIST_USER_ACCOUNTS_SUMMARY = 'List user auth accounts'

export const LIST_USER_ACCOUNTS_DESCRIPTION = `
Returns the linked sign-in provider accounts for a user. **Admin only**.
`

export const LIST_USER_ACCOUNTS_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
  404: { description: 'User not found.' },
} as const

export const LIST_USER_FEATURES_SUMMARY = 'List user feature grants'

export const LIST_USER_FEATURES_DESCRIPTION = `
Returns all feature grants for a user. **Admin only**.
`

export const LIST_USER_FEATURES_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
  404: { description: 'User not found.' },
} as const

export const LIST_USER_APPS_SUMMARY = 'List apps for user'

export const LIST_USER_APPS_DESCRIPTION = `
Returns all apps the user has authenticated through (by session enrollment).
Ordered by first enrollment date ascending. **Admin only**.
`

export const LIST_USER_APPS_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
  404: { description: 'User not found.' },
} as const

export const LIST_USERS_SUMMARY = 'List users'

export const LIST_USERS_DESCRIPTION = `
Returns a paginated list of all users. **Admin only** (requires \`X-Internal-Key\`).
`

export const LIST_USERS_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
} as const

export const LIST_MY_ADDRESSES_SUMMARY = 'List my addresses'

export const LIST_MY_ADDRESSES_DESCRIPTION =
  'Returns addresses owned by the current consumer user.'

export const LIST_MY_ADDRESSES_RESPONSES = {} as const

export const LIST_MY_CONTACTS_SUMMARY = 'List my contacts'

export const LIST_MY_CONTACTS_DESCRIPTION =
  'Returns one-way contacts saved by the current consumer user.'

export const LIST_MY_CONTACTS_RESPONSES = {} as const

export const LIST_MY_MEMBERSHIPS_SUMMARY = 'List my memberships'

export const LIST_MY_MEMBERSHIPS_DESCRIPTION = `Returns the current user's organization memberships with each org's id, name, slug, status, and logo URL. Session tier — the self-scoped replacement for the admin routing-memberships lookup.`

export const LIST_MY_MEMBERSHIPS_RESPONSES = {} as const

export const RETRIEVE_MY_ADDRESS_SUMMARY = 'Retrieve my address'

export const RETRIEVE_MY_ADDRESS_DESCRIPTION =
  'Returns one address owned by the current consumer user.'

export const RETRIEVE_MY_ADDRESS_RESPONSES = {
  404: { description: 'Address not found.' },
} as const

export const RETRIEVE_MY_CONTACT_SUMMARY = 'Retrieve my contact'

export const RETRIEVE_MY_CONTACT_DESCRIPTION =
  'Returns one saved contact owned by the current consumer user.'

export const RETRIEVE_MY_CONTACT_RESPONSES = {
  404: { description: 'Contact not found.' },
} as const

export const RETRIEVE_MY_PROFILE_SUMMARY = 'Retrieve my profile'

export const RETRIEVE_MY_PROFILE_DESCRIPTION = `Returns the current consumer user's personal profile.`

export const RETRIEVE_MY_PROFILE_RESPONSES = {
  404: { description: 'User not found.' },
} as const

export const RETRIEVE_USER_SUMMARY = 'Retrieve user'

export const RETRIEVE_USER_DESCRIPTION = `
Returns a single user by ID. **Admin only** (requires \`X-Internal-Key\`).
`

export const RETRIEVE_USER_RESPONSES = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
  404: { description: 'No user found with this ID.' },
} as const

export const REVOKE_OAUTH_GRANT_SUMMARY = 'Revoke user OAuth grant'

export const REVOKE_OAUTH_GRANT_DESCRIPTION = `
Revokes a specific OAuth grant, preventing the app from obtaining new tokens
for this user until they re-authorize.
`

export const SEARCH_USERS_SUMMARY = 'Search users'

export const SEARCH_USERS_DESCRIPTION =
  'Searches users by email, username, or name. **Admin only**.'

export const SEARCH_USERS_RESPONSES = {} as const

export const UNBAN_USER_SUMMARY = 'Unban user'

export const UNBAN_USER_DESCRIPTION = `Lifts a user's ban, restoring their ability to sign in, and clears the stored ban reason. **Admin only**.`

export const UNBAN_USER_RESPONSES = {
  404: { description: 'No user found with this ID.' },
} as const

export const USERNAME_AVAILABILITY_SUMMARY = 'Check username availability'

export const USERNAME_AVAILABILITY_DESCRIPTION =
  'Checks whether a username can be claimed. Runs three gates — format, the reserved list, and whether another user already holds it (including soft-deleted users). Pass `exclude_user_id` to ignore the user currently holding the name (e.g. when editing their own profile). **Admin only**.'

export const USERNAME_AVAILABILITY_RESPONSES = {} as const

export const UPDATE_USER_SUMMARY = 'Update user'

export const UPDATE_USER_DESCRIPTION = `Updates a user's editable profile and platform fields. **Admin only**.`

export const UPDATE_USER_RESPONSES = {
  404: { description: 'No user found with this ID.' },
} as const

export const UPDATE_MY_ADDRESS_SUMMARY = 'Update my address'

export const UPDATE_MY_ADDRESS_DESCRIPTION =
  'Updates an address owned by the current consumer user.'

export const UPDATE_MY_ADDRESS_RESPONSES = {
  400: { description: 'No fields were provided.' },
  404: { description: 'Address not found.' },
} as const

export const UPDATE_MY_CONTACT_SUMMARY = 'Update my contact'

export const UPDATE_MY_CONTACT_DESCRIPTION =
  'Updates a saved contact owned by the current consumer user.'

export const UPDATE_MY_CONTACT_RESPONSES = {
  400: { description: 'No fields were provided.' },
  404: { description: 'Contact not found.' },
} as const

export const UPDATE_MY_PROFILE_SUMMARY = 'Update my profile'

export const UPDATE_MY_PROFILE_DESCRIPTION =
  'Updates personal profile fields for the current consumer user.'

export const UPDATE_MY_PROFILE_RESPONSES = {} as const

export const LIST_RESERVED_USERNAMES_SUMMARY = 'List reserved usernames'

export const LIST_RESERVED_USERNAMES_DESCRIPTION =
  'Returns all reserved usernames. These usernames cannot be claimed by any user. **Admin only**.'

export const LIST_RESERVED_USERNAMES_RESPONSES = {} as const

export const CREATE_RESERVED_USERNAME_SUMMARY = 'Reserve a username'

export const CREATE_RESERVED_USERNAME_DESCRIPTION =
  'Adds a username to the reserved list, preventing any user from claiming it. The username must pass the standard format rules. **Admin only**.'

export const CREATE_RESERVED_USERNAME_RESPONSES = {
  409: { description: 'This username is already on the reserved list.' },
  400: { description: 'The username does not pass format validation.' },
} as const

export const DELETE_RESERVED_USERNAME_SUMMARY = 'Remove a reserved username'

export const DELETE_RESERVED_USERNAME_DESCRIPTION =
  'Removes a username from the reserved list, allowing it to be claimed. **Admin only**.'

export const DELETE_RESERVED_USERNAME_RESPONSES = {
  404: { description: 'No reserved username found with this value.' },
} as const

export const UNLINK_USER_ACCOUNT_SUMMARY = 'Unlink auth account'

export const UNLINK_USER_ACCOUNT_DESCRIPTION =
  'Removes a linked sign-in provider account from a user. The user will no longer be able to sign in through that provider. **Admin only**.'

export const UNLINK_USER_ACCOUNT_RESPONSES = {
  404: { description: 'User or account not found.' },
} as const

export const REVOKE_USER_SESSIONS_SUMMARY = 'Revoke all user sessions'

export const REVOKE_USER_SESSIONS_DESCRIPTION =
  'Immediately invalidates every active session for a user, forcing them to sign in again on all devices. Does not ban the user. **Admin only**.'

export const REVOKE_USER_SESSIONS_RESPONSES = {
  404: { description: 'No user found with this ID.' },
} as const

export const LIST_USER_IDENTIFICATIONS_SUMMARY = 'List user identifications'

export const LIST_USER_IDENTIFICATIONS_DESCRIPTION = `
Returns a user's identification records (TRN, passport, driver's license).
Values are always masked here — the full value is only ever returned by the
dedicated \`/disclose\` endpoint. **Admin only**.
`

export const LIST_USER_IDENTIFICATIONS_RESPONSES = {
  404: { description: 'No user found with this ID.' },
} as const

export const CREATE_USER_IDENTIFICATION_SUMMARY = 'Create user identification'

export const CREATE_USER_IDENTIFICATION_DESCRIPTION = `
Adds a verified identifier to a user's account. The value is normalized
(whitespace/dashes stripped; TRN keeps digits only, other types uppercase)
and validated against the type's pattern before storage. Returns the masked
value only. **Admin only**.
`

export const CREATE_USER_IDENTIFICATION_RESPONSES = {
  404: { description: 'No user found with this ID.' },
  409: {
    description: 'An identification of this type already exists for this user.',
  },
  422: {
    description: `Unknown identification type, or the value does not match the type's pattern.`,
  },
} as const

export const UPDATE_USER_IDENTIFICATION_SUMMARY = 'Update user identification'

export const UPDATE_USER_IDENTIFICATION_DESCRIPTION = `
Replaces the value of an existing identification and resets its verification
state (\`verified\` back to \`false\`, \`verified_at\`/\`verified_by\` cleared).
**Admin only**.
`

export const UPDATE_USER_IDENTIFICATION_RESPONSES = {
  404: { description: 'No identification of this type exists for this user.' },
  422: {
    description: `Unknown identification type, or the value does not match the type's pattern.`,
  },
} as const

export const DELETE_USER_IDENTIFICATION_SUMMARY = 'Delete user identification'

export const DELETE_USER_IDENTIFICATION_DESCRIPTION = `
Deletes an identification record. Follows the platform deletion policy
(\`DELETION_MODE\`) — soft-deleted in production, hard-deleted in development.
Returns a deletion tombstone. **Admin only**.
`

export const DELETE_USER_IDENTIFICATION_RESPONSES = {
  404: { description: 'No identification of this type exists for this user.' },
} as const

export const DISCLOSE_USER_IDENTIFICATION_SUMMARY =
  'Disclose user identification'

export const DISCLOSE_USER_IDENTIFICATION_DESCRIPTION = `
Returns the full, unmasked identification value. \`POST\` (not \`GET\`) because
this has an audit side effect. Enforcement, in order:

1. The identification exists.
2. \`app_slug\` is declared as needing this identification type in the core
   entitlement allowlist (\`core/identifications.py\`).
3. The requesting organization holds an **active** subscription to that app.
4. An audit event is written (organization id, app slug, identification
   type, user id, reason — never the value).

**Admin only**.
`

export const DISCLOSE_USER_IDENTIFICATION_RESPONSES = {
  403: {
    description:
      'The app is not entitled to this identification type, or the organization does not have an active subscription to the app.',
  },
  404: { description: 'No identification of this type exists for this user.' },
} as const

export const VERIFY_USER_IDENTIFICATION_SUMMARY = 'Verify user identification'

export const VERIFY_USER_IDENTIFICATION_DESCRIPTION = `
Marks an identification as verified, recording the verifying actor and the
verification timestamp. **Admin only**.
`

export const VERIFY_USER_IDENTIFICATION_RESPONSES = {
  404: { description: 'No identification of this type exists for this user.' },
} as const
