/**
 * OpenAPI prose for the Memberships module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

const _ADMIN = {
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
} as const

export const CREATE_MEMBERSHIP_SUMMARY = 'Create membership'

export const CREATE_MEMBERSHIP_DESCRIPTION = `
Creates a membership linking a user to an organization. The user must have
\`account_type: enterprise\` and must not already be a member of the organization.
**Admin only**.
`

// The Python source declares a 403 of 'User is not an enterprise account.' and
// then spreads `**_ADMIN` after it, so `_ADMIN`'s 403 silently wins and the
// published description is the admin one. That is written out here rather than
// reproduced as a shadowed key, which TypeScript rejects outright (TS2783). The
// shadowing looks accidental — worth resolving in the contract, not silently in
// a migration.
export const CREATE_MEMBERSHIP_RESPONSES = {
  400: { description: 'Organization not found or invalid input.' },
  401: { description: 'Missing or invalid internal key.' },
  403: { description: 'Caller is not an admin.' },
  404: { description: 'User not found.' },
  409: { description: 'User is already a member of this organization.' },
} as const

export const DELETE_MEMBERSHIP_SUMMARY = 'Delete membership'

export const DELETE_MEMBERSHIP_DESCRIPTION =
  'Deletes a membership. Returns a deletion tombstone. **Admin only**.'

export const DELETE_MEMBERSHIP_RESPONSES = {
  ..._ADMIN,
  404: { description: 'Membership not found.' },
} as const

export const LIST_MEMBERSHIPS_SUMMARY = 'List memberships'

export const LIST_MEMBERSHIPS_DESCRIPTION = `
Returns a paginated list of memberships. **Admin only**.

Supports optional \`organization_id\` and \`user_id\` filters.
`

export const LIST_MEMBERSHIPS_RESPONSES = { ..._ADMIN } as const

export const RETRIEVE_MEMBERSHIP_SUMMARY = 'Retrieve membership'

export const RETRIEVE_MEMBERSHIP_DESCRIPTION =
  'Returns a single membership by ID. **Admin only**.'

export const RETRIEVE_MEMBERSHIP_RESPONSES = {
  ..._ADMIN,
  404: { description: 'Membership not found.' },
} as const

export const UPDATE_MEMBERSHIP_SUMMARY = 'Update membership'

export const UPDATE_MEMBERSHIP_DESCRIPTION = `Updates a membership's role, status, or WorkOS membership ID. **Admin only**.`

export const UPDATE_MEMBERSHIP_RESPONSES = {
  ..._ADMIN,
  404: { description: 'Membership not found.' },
  409: { description: 'WorkOS membership ID is already in use.' },
} as const
