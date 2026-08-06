/**
 * OpenAPI prose for the Organizations module. Pure data — this file imports nothing,
 * which is what keeps route files readable and documentation reviewable on its
 * own (.claude/rules/express-api.md).
 */

const _ADMIN_401 = {
  401: { description: 'Missing or invalid internal key.' },
} as const

const _ADMIN_403 = {
  403: { description: 'Caller is not an admin.' },
} as const

const _ADMIN = { ..._ADMIN_401, ..._ADMIN_403 } as const

const _MEMBER_SESSION = {
  401: { description: 'Missing or invalid session.' },
  403: { description: 'Caller is not an active member of the organization.' },
} as const

export const BOOTSTRAP_ORG_SUMMARY = 'Bootstrap organization for existing user'

export const BOOTSTRAP_ORG_DESCRIPTION = `
Creates a WorkOS organization and active owner membership for an existing 876 user. **Admin only**.

* Generates a unique slug from the organization name when omitted.
* Provisions the default organization roles and Enterprise app entitlement.
* Creates the existing user's owner membership with active status.
`

export const BOOTSTRAP_ORG_RESPONSES = {
  ..._ADMIN,
  400: { description: 'Organization name or provided slug is invalid.' },
  404: { description: 'Owner user not found.' },
  409: { description: 'Provided organization slug already exists.' },
} as const

export const CREATE_ORG_SUMMARY = 'Create organization'

export const CREATE_ORG_DESCRIPTION = `
Creates a new organization. **Admin only**.

* Validates and normalizes the slug.
* Rejects duplicate slugs and duplicate WorkOS organization IDs.
`

export const CREATE_ORG_RESPONSES = {
  ..._ADMIN,
  400: { description: 'Invalid slug or missing required fields.' },
  409: { description: 'Slug or WorkOS organization ID already exists.' },
} as const

export const CREATE_ORG_MEMBERSHIP_SUMMARY = 'Create organization membership'

export const CREATE_ORG_MEMBERSHIP_DESCRIPTION = `
Creates a membership linking an enterprise user to an organization. **Admin only**.

* User must have \`account_type = 'enterprise'\`.
* Duplicate memberships (same org + user) are rejected.
`

export const CREATE_ORG_MEMBERSHIP_RESPONSES = {
  ..._ADMIN_401,
  400: { description: 'Organization not found or invalid input.' },
  403: { description: 'User is not an enterprise account.' },
  404: { description: 'User not found.' },
  409: { description: 'User is already a member of this organization.' },
} as const

export const DELETE_ORG_SUMMARY = 'Delete organization'

export const DELETE_ORG_DESCRIPTION =
  'Deletes an organization. Returns a deletion tombstone. **Admin only**.'

export const DELETE_ORG_RESPONSES = {
  ..._ADMIN,
  404: { description: 'Organization not found.' },
} as const

export const LIST_ORG_MEMBERSHIPS_SUMMARY = 'List organization memberships'

export const LIST_ORG_MEMBERSHIPS_DESCRIPTION =
  'Returns a paginated list of memberships for an organization. **Admin only**.'

export const LIST_ORG_MEMBERSHIPS_RESPONSES = {
  ..._ADMIN,
  404: { description: 'Organization not found.' },
} as const

export const LIST_ORGS_SUMMARY = 'List organizations'

export const LIST_ORGS_DESCRIPTION =
  'Returns a paginated list of all organizations. **Admin only**.'

export const LIST_ORGS_RESPONSES = { ..._ADMIN } as const

export const RETRIEVE_ORG_SUMMARY = 'Retrieve organization'

export const RETRIEVE_ORG_DESCRIPTION =
  'Returns a single organization by ID. **Admin only**.'

export const RETRIEVE_ORG_RESPONSES = {
  ..._ADMIN,
  404: { description: 'Organization not found.' },
} as const

export const RETRIEVE_ORG_BY_SLUG_SUMMARY = 'Retrieve organization by slug'

export const RETRIEVE_ORG_BY_SLUG_DESCRIPTION =
  'Returns a single organization by slug. **Admin only**.'

export const RETRIEVE_ORG_BY_SLUG_RESPONSES = {
  ..._ADMIN,
  404: { description: 'Organization not found.' },
} as const

export const SEARCH_ORGS_SUMMARY = 'Search organizations'

export const SEARCH_ORGS_DESCRIPTION =
  'Searches organizations by name or slug. **Admin only**.'

export const SEARCH_ORGS_RESPONSES = { ..._ADMIN } as const

export const UPDATE_ORG_SUMMARY = 'Update organization'

export const UPDATE_ORG_DESCRIPTION = `Updates an organization's name, slug, status, or metadata. **Admin only**.`

export const UPDATE_ORG_RESPONSES = {
  ..._ADMIN,
  404: { description: 'Organization not found.' },
  409: { description: 'New slug or WorkOS ID is already in use.' },
} as const

export const RETRIEVE_ORG_PROFILE_SUMMARY = 'Retrieve organization profile'

export const RETRIEVE_ORG_PROFILE_DESCRIPTION =
  'Returns the profile of an organization the caller belongs to. **Session-scoped** — requires an active membership in the organization. Used by product apps (e.g. Couriers) to prefill the organization settings form.'

export const RETRIEVE_ORG_PROFILE_RESPONSES = {
  ..._MEMBER_SESSION,
  404: { description: 'Organization not found.' },
} as const

export const UPDATE_ORG_PROFILE_SUMMARY = 'Update organization profile'

export const UPDATE_ORG_PROFILE_DESCRIPTION =
  'Updates the identity profile (name, business identity, address, contact, locale) of an organization the caller owns or administers. **Session-scoped** — requires an active `owner` or `admin` membership. Privileged fields (slug, status, WorkOS ID, metadata) are not editable through this endpoint; use the admin update instead.'

export const UPDATE_ORG_PROFILE_RESPONSES = {
  ..._MEMBER_SESSION,
  404: { description: 'Organization not found.' },
} as const

export const GET_SUBSCRIPTION_SUMMARY = 'Get subscription'

export const GET_SUBSCRIPTION_DESCRIPTION =
  'Returns the subscription for a specific app within an organization. **Admin only**.'

export const GET_SUBSCRIPTION_RESPONSES = {
  ..._ADMIN,
  404: { description: 'Subscription not found.' },
} as const

export const GET_SUBSCRIPTION_BY_SLUG_SUMMARY = 'Get subscription by slug'

export const GET_SUBSCRIPTION_BY_SLUG_DESCRIPTION =
  'Returns the subscription for a platform app identified by slug. **Admin only**.'

export const GET_SUBSCRIPTION_BY_SLUG_RESPONSES = {
  ..._ADMIN,
  404: { description: 'App or subscription not found.' },
} as const

export const LIST_ORG_SUBSCRIPTIONS_SUMMARY = 'List subscriptions'

export const LIST_ORG_SUBSCRIPTIONS_DESCRIPTION =
  'Returns all app subscriptions for an organization. **Admin only**.'

export const LIST_ORG_SUBSCRIPTIONS_RESPONSES = { ..._ADMIN } as const

export const LIST_MY_ORG_SUBSCRIPTIONS_SUMMARY = `List my organization's subscriptions`

export const LIST_MY_ORG_SUBSCRIPTIONS_DESCRIPTION =
  'Returns all app subscriptions for an organization the caller is an active member of. **Session tier** — used by product apps (Enterprise billing, app gating) without the internal key.'

export const LIST_MY_ORG_SUBSCRIPTIONS_RESPONSES = {
  ..._MEMBER_SESSION,
} as const

export const LIST_SUBSCRIPTIONS_BATCH_SUMMARY = 'Batch list subscriptions'

export const LIST_SUBSCRIPTIONS_BATCH_DESCRIPTION =
  'Returns app subscriptions for multiple organizations in one query. **Admin only**.'

export const LIST_SUBSCRIPTIONS_BATCH_RESPONSES = { ..._ADMIN } as const

export const PROVISION_SUBSCRIPTION_SUMMARY = 'Create subscription'

export const PROVISION_SUBSCRIPTION_DESCRIPTION = `Grants an organization access to a platform app (upserts active). Defaults to the app's default price when \`price_id\` is omitted; an existing subscription's items are never changed by re-provisioning. **Admin only**.`

export const PROVISION_SUBSCRIPTION_RESPONSES = {
  ..._ADMIN,
  404: { description: 'Organization or app not found.' },
} as const

export const PROVISION_MY_ORG_SUBSCRIPTION_SUMMARY = `Create my organization's subscription`

export const PROVISION_MY_ORG_SUBSCRIPTION_DESCRIPTION = `Grants the caller's organization access to a platform app (upserts active). The caller must be an active owner or admin of the organization. Defaults to the app's default price when \`price_id\` is omitted. **Session tier** — used by app onboarding/activation flows.`

export const PROVISION_MY_ORG_SUBSCRIPTION_RESPONSES = {
  ..._MEMBER_SESSION,
  404: { description: 'Organization or app not found.' },
  422: { description: 'Neither app_id nor app_slug was provided.' },
} as const

export const RETRIEVE_MY_ORG_SUBSCRIPTION_BY_SLUG_SUMMARY = `Get my organization's subscription by slug`

export const RETRIEVE_MY_ORG_SUBSCRIPTION_BY_SLUG_DESCRIPTION = `Returns the caller's organization's subscription for a platform app identified by slug. The caller must be an active member of the organization. **Session tier** — the app access gate.`

export const RETRIEVE_MY_ORG_SUBSCRIPTION_BY_SLUG_RESPONSES = {
  ..._MEMBER_SESSION,
  404: { description: 'No subscription exists for this app.' },
} as const

export const UPDATE_SUBSCRIPTION_SUMMARY = 'Update subscription'

export const UPDATE_SUBSCRIPTION_DESCRIPTION = `Updates an organization's subscription status, cancellation flag, and/or subscribed price for an app. At least one of \`status\`/\`cancel_at_period_end\`/\`price_id\` is required. **Admin only**.`

export const UPDATE_SUBSCRIPTION_RESPONSES = {
  ..._ADMIN,
  404: { description: 'Subscription not found.' },
} as const

const _ORG_404 = {
  404: { description: 'Resource not found in this organization.' },
} as const

const _STRUCTURE_READ = { ..._MEMBER_SESSION, ..._ORG_404 } as const

const _STRUCTURE_WRITE_DESC =
  ' The caller must be an active owner or admin of the organization (or the admin tier).'

const _CONTACT_WRITE_DESC = ` Requires the \`org:update\` permission on the caller's membership (or the admin tier).`

export const CREATE_ORG_CONTACT_SUMMARY = 'Create contact'

export const CREATE_ORG_CONTACT_DESCRIPTION =
  'Creates a contact person for the organization. Contacts may be linked to a platform member via `user_id` or stand alone as external contacts.' +
  _CONTACT_WRITE_DESC

export const CREATE_ORG_CONTACT_RESPONSES = { ..._STRUCTURE_READ } as const

export const CREATE_ORG_DEPARTMENT_SUMMARY = 'Create department'

export const CREATE_ORG_DEPARTMENT_DESCRIPTION =
  'Creates a department within the organization.' + _STRUCTURE_WRITE_DESC

export const CREATE_ORG_DEPARTMENT_RESPONSES = { ..._STRUCTURE_READ } as const

export const CREATE_ORG_EMPLOYEE_SUMMARY = 'Create employee profile'

export const CREATE_ORG_EMPLOYEE_DESCRIPTION =
  'Creates the employment record for an org membership (1:1). Fails if the membership already has a profile or belongs to another organization.' +
  _STRUCTURE_WRITE_DESC

export const CREATE_ORG_EMPLOYEE_RESPONSES = {
  ..._STRUCTURE_READ,
  409: { description: 'The membership already has an employee profile.' },
} as const

export const CREATE_ORG_LOCATION_SUMMARY = 'Create location'

export const CREATE_ORG_LOCATION_DESCRIPTION =
  'Creates a location (branch, office, warehouse) for the organization.' +
  _STRUCTURE_WRITE_DESC

export const CREATE_ORG_LOCATION_RESPONSES = { ..._STRUCTURE_READ } as const

export const DELETE_ORG_CONTACT_SUMMARY = 'Delete contact'

export const DELETE_ORG_CONTACT_DESCRIPTION =
  'Soft-deletes a contact.' + _CONTACT_WRITE_DESC

export const DELETE_ORG_CONTACT_RESPONSES = { ..._STRUCTURE_READ } as const

export const DELETE_ORG_DEPARTMENT_SUMMARY = 'Delete department'

export const DELETE_ORG_DEPARTMENT_DESCRIPTION =
  'Soft-deletes a department.' + _STRUCTURE_WRITE_DESC

export const DELETE_ORG_DEPARTMENT_RESPONSES = { ..._STRUCTURE_READ } as const

export const DELETE_ORG_EMPLOYEE_SUMMARY = 'Delete employee profile'

export const DELETE_ORG_EMPLOYEE_DESCRIPTION =
  'Soft-deletes an employee profile.' + _STRUCTURE_WRITE_DESC

export const DELETE_ORG_EMPLOYEE_RESPONSES = { ..._STRUCTURE_READ } as const

export const DELETE_ORG_LOCATION_SUMMARY = 'Delete location'

export const DELETE_ORG_LOCATION_DESCRIPTION =
  'Soft-deletes a location.' + _STRUCTURE_WRITE_DESC

export const DELETE_ORG_LOCATION_RESPONSES = { ..._STRUCTURE_READ } as const

export const LIST_ORG_CONTACTS_SUMMARY = 'List contacts'

export const LIST_ORG_CONTACTS_DESCRIPTION = `Returns the organization's contacts. The caller must be an active member of the organization.`

export const LIST_ORG_CONTACTS_RESPONSES = { ..._MEMBER_SESSION } as const

export const LIST_ORG_DEPARTMENTS_SUMMARY = 'List departments'

export const LIST_ORG_DEPARTMENTS_DESCRIPTION = `Returns the organization's departments. The caller must be an active member of the organization.`

export const LIST_ORG_DEPARTMENTS_RESPONSES = { ..._MEMBER_SESSION } as const

export const LIST_ORG_EMPLOYEES_SUMMARY = 'List employee profiles'

export const LIST_ORG_EMPLOYEES_DESCRIPTION = `Returns the organization's employee profiles. The caller must be an active member of the organization.`

export const LIST_ORG_EMPLOYEES_RESPONSES = { ..._MEMBER_SESSION } as const

export const LIST_ORG_LOCATIONS_SUMMARY = 'List locations'

export const LIST_ORG_LOCATIONS_DESCRIPTION = `Returns the organization's locations. The caller must be an active member of the organization.`

export const LIST_ORG_LOCATIONS_RESPONSES = { ..._MEMBER_SESSION } as const

export const RETRIEVE_ORG_CONTACT_SUMMARY = 'Retrieve contact'

export const RETRIEVE_ORG_CONTACT_DESCRIPTION =
  'Returns a single contact by ID.'

export const RETRIEVE_ORG_CONTACT_RESPONSES = { ..._STRUCTURE_READ } as const

export const RETRIEVE_ORG_DEPARTMENT_SUMMARY = 'Retrieve department'

export const RETRIEVE_ORG_DEPARTMENT_DESCRIPTION =
  'Returns a single department by ID.'

export const RETRIEVE_ORG_DEPARTMENT_RESPONSES = { ..._STRUCTURE_READ } as const

export const RETRIEVE_ORG_EMPLOYEE_SUMMARY = 'Retrieve employee profile'

export const RETRIEVE_ORG_EMPLOYEE_DESCRIPTION =
  'Returns a single employee profile by ID.'

export const RETRIEVE_ORG_EMPLOYEE_RESPONSES = { ..._STRUCTURE_READ } as const

export const RETRIEVE_ORG_LOCATION_SUMMARY = 'Retrieve location'

export const RETRIEVE_ORG_LOCATION_DESCRIPTION =
  'Returns a single location by ID.'

export const RETRIEVE_ORG_LOCATION_RESPONSES = { ..._STRUCTURE_READ } as const

export const UPDATE_ORG_CONTACT_SUMMARY = 'Update contact'

export const UPDATE_ORG_CONTACT_DESCRIPTION =
  'Updates a contact.' + _CONTACT_WRITE_DESC

export const UPDATE_ORG_CONTACT_RESPONSES = { ..._STRUCTURE_READ } as const

export const UPDATE_ORG_DEPARTMENT_SUMMARY = 'Update department'

export const UPDATE_ORG_DEPARTMENT_DESCRIPTION =
  'Updates a department.' + _STRUCTURE_WRITE_DESC

export const UPDATE_ORG_DEPARTMENT_RESPONSES = { ..._STRUCTURE_READ } as const

export const UPDATE_ORG_EMPLOYEE_SUMMARY = 'Update employee profile'

export const UPDATE_ORG_EMPLOYEE_DESCRIPTION =
  'Updates an employee profile.' + _STRUCTURE_WRITE_DESC

export const UPDATE_ORG_EMPLOYEE_RESPONSES = { ..._STRUCTURE_READ } as const

export const UPDATE_ORG_LOCATION_SUMMARY = 'Update location'

export const UPDATE_ORG_LOCATION_DESCRIPTION =
  'Updates a location.' + _STRUCTURE_WRITE_DESC

export const UPDATE_ORG_LOCATION_RESPONSES = { ..._STRUCTURE_READ } as const

export const RETRIEVE_MY_ORG_DETAILS_SUMMARY = `Get my organization's details`

export const RETRIEVE_MY_ORG_DETAILS_DESCRIPTION = `Returns the caller's organization record. The caller must be an active member of the organization. **Session tier** — backs the Enterprise app's organization pages.`

export const RETRIEVE_MY_ORG_DETAILS_RESPONSES = { ..._MEMBER_SESSION } as const

export const UPDATE_MY_ORG_DETAILS_SUMMARY = `Update my organization's details`

export const UPDATE_MY_ORG_DETAILS_DESCRIPTION =
  `Updates the caller's organization profile (business identity, contact, address, locale). Platform-controlled fields (slug, status) are not updatable here.` +
  _STRUCTURE_WRITE_DESC

export const UPDATE_MY_ORG_DETAILS_RESPONSES = { ..._STRUCTURE_READ } as const

export const PERMISSION_CATALOG_SUMMARY = 'Get org permission catalog'

export const PERMISSION_CATALOG_DESCRIPTION =
  'Returns the grouped catalog of org-level permission strings used to build and edit organization roles. Static; identical for every organization.'

export const PERMISSION_CATALOG_RESPONSES = {} as const

export const LIST_ORG_ROLES_SUMMARY = 'List organization roles'

export const LIST_ORG_ROLES_DESCRIPTION = `Returns the organization's roles — the default system roles seeded at creation plus any custom roles. Requires an active membership. **Session tier**.`

export const LIST_ORG_ROLES_RESPONSES = { ..._MEMBER_SESSION } as const

export const CREATE_ORG_ROLE_SUMMARY = 'Create organization role'

export const CREATE_ORG_ROLE_DESCRIPTION =
  'Creates a custom role from catalog permissions. Requires the `roles:manage` permission. Role names must be unique within the organization. **Session tier**.'

export const CREATE_ORG_ROLE_RESPONSES = {
  ..._MEMBER_SESSION,
  400: { description: 'Unknown permission or invalid name.' },
  409: { description: 'Role name already exists.' },
} as const

export const RETRIEVE_ORG_ROLE_SUMMARY = 'Get organization role'

export const RETRIEVE_ORG_ROLE_DESCRIPTION =
  'Returns one organization role. Requires an active membership. **Session tier**.'

export const RETRIEVE_ORG_ROLE_RESPONSES = {
  ..._MEMBER_SESSION,
  404: { description: 'No role with this ID in the organization.' },
} as const

export const UPDATE_ORG_ROLE_SUMMARY = 'Update organization role'

export const UPDATE_ORG_ROLE_DESCRIPTION = `Updates a custom role's display name, description, or permission set. System roles are immutable. Requires \`roles:manage\`. **Session tier**.`

export const UPDATE_ORG_ROLE_RESPONSES = {
  ..._MEMBER_SESSION,
  400: { description: 'System role or unknown permission.' },
  404: { description: 'No role with this ID in the organization.' },
} as const

export const DELETE_ORG_ROLE_SUMMARY = 'Delete organization role'

export const DELETE_ORG_ROLE_DESCRIPTION =
  'Deletes a custom role. System roles and roles still linked to memberships cannot be deleted. Requires `roles:manage`. **Session tier**.'

export const DELETE_ORG_ROLE_RESPONSES = {
  ..._MEMBER_SESSION,
  400: { description: 'System role.' },
  404: { description: 'No role with this ID in the organization.' },
  409: { description: 'Role is still assigned to members.' },
} as const

export const LIST_ORG_MEMBERS_SUMMARY = 'List organization members'

export const LIST_ORG_MEMBERS_DESCRIPTION = `Returns the organization's members with basic user details and role. Requires the \`members:read\` permission. **Session tier**.`

export const LIST_ORG_MEMBERS_RESPONSES = { ..._MEMBER_SESSION } as const

export const RETRIEVE_ORG_MEMBER_ME_SUMMARY = 'Get my membership'

export const RETRIEVE_ORG_MEMBER_ME_DESCRIPTION = `Returns the caller's own membership, role, and effective permission set for the organization. Requires an active membership. **Session tier**.`

export const RETRIEVE_ORG_MEMBER_ME_RESPONSES = { ..._MEMBER_SESSION } as const

export const UPDATE_ORG_MEMBER_ROLE_SUMMARY = `Change a member's role`

export const UPDATE_ORG_MEMBER_ROLE_DESCRIPTION =
  'Assigns an org role (system or custom) to a member. Requires `members:manage`. Only an owner may grant or remove the owner role, and the last active owner cannot be demoted. **Session tier**.'

export const UPDATE_ORG_MEMBER_ROLE_RESPONSES = {
  ..._MEMBER_SESSION,
  400: { description: 'Unknown role or last-owner demotion.' },
  404: { description: 'No membership with this ID in the organization.' },
} as const

export const LIST_APP_ASSIGNMENTS_SUMMARY = 'List app assignments'

export const LIST_APP_ASSIGNMENTS_DESCRIPTION =
  'Returns per-member app assignments for the organization, optionally filtered by member or app. Requires the `apps:read` permission. **Session tier**.'

export const LIST_APP_ASSIGNMENTS_RESPONSES = { ..._MEMBER_SESSION } as const

export const CREATE_APP_ASSIGNMENT_SUMMARY = 'Assign a member to an app'

export const CREATE_APP_ASSIGNMENT_DESCRIPTION =
  'Grants a member access to a platform app the organization is provisioned for (re-activates a revoked assignment). Requires `apps:assign`. **Session tier**.'

export const CREATE_APP_ASSIGNMENT_RESPONSES = {
  ..._MEMBER_SESSION,
  404: { description: 'App or member not found.' },
  409: { description: 'Organization is not provisioned for this app.' },
} as const

export const REVOKE_APP_ASSIGNMENT_SUMMARY = 'Revoke an app assignment'

export const REVOKE_APP_ASSIGNMENT_DESCRIPTION = `Revokes a member's access to an app (keeps the record with \`status = 'revoked'\`). Requires \`apps:assign\`. **Session tier**.`

export const REVOKE_APP_ASSIGNMENT_RESPONSES = {
  ..._MEMBER_SESSION,
  404: { description: 'No assignment with this ID in the organization.' },
} as const
