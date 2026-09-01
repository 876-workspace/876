/**
 * Organization-level permission catalog and default role definitions.
 *
 * Single source of truth for the org roles/permissions framework used by the
 * Enterprise app (and any product app that consults org membership permissions).
 *
 * Terminology (industry-standard, SCIM/Entra/Zoho conventions):
 *
 * - An organization is **provisioned** onto a platform app (`subscriptions`
 *   table — org→app entitlement).
 * - A member is **assigned** to a provisioned app (`app_assignments` table —
 *   user→app grant inside the org).
 *
 * Permissions are `resource:action` strings scoped to a single organization.
 * They govern what a member can do *inside the Enterprise workspace* (the org
 * directory app). Product apps (Couriers, …) own their own in-app permission
 * models; the platform only answers "is this member assigned to this app".
 *
 * Default roles are seeded per organization at creation (`is_system=true`,
 * immutable through the API). Organizations may add custom roles
 * (`is_system=false`) built from this catalog.
 *
 * ## This is a pure catalog — the resolver is not here
 *
 * Ported from `core/org_permissions.py`, which is data and two lookups with no
 * I/O. The DB-backed `resolve_member_permissions` lives in
 * `services/provisioning.py` and belongs to the provisioning module, not to
 * `platform/` — it needs a session, and `platform-is-leaf` forbids that here.
 *
 * ## Array order is a stored contract
 *
 * These permission arrays are seeded into `organization_roles.permissions`.
 * Every organization receives the same three system roles: `super-admin`,
 * `admin`, and `staff`.
 */

/** The catalog, grouped for display. Group order and member order are both preserved. */
export const ORG_PERMISSION_GROUPS: Readonly<
  Record<string, readonly string[]>
> = {
  Organization: ['org:read', 'org:update', 'org:delete'],
  Billing: ['billing:read', 'billing:manage'],
  Members: ['members:read', 'members:invite', 'members:manage'],
  Roles: ['roles:read', 'roles:manage'],
  Apps: ['apps:read', 'apps:provision', 'apps:assign'],
  Structure: ['structure:read', 'structure:manage'],
}

/** Every permission in the catalog. Membership test only — see {@link ALL_ORG_PERMISSIONS_SORTED} for the seeded order. */
export const ALL_ORG_PERMISSIONS: ReadonlySet<string> = new Set(
  Object.values(ORG_PERMISSION_GROUPS).flat()
)

/** The catalog as a sorted array — the exact value seeded for super admins. */
export const ALL_ORG_PERMISSIONS_SORTED: readonly string[] = [
  ...ALL_ORG_PERMISSIONS,
].sort()

export function isValidOrgPermission(permission: string): boolean {
  return ALL_ORG_PERMISSIONS.has(permission)
}

const READ_ONLY_STAFF: readonly string[] = [
  'org:read',
  'members:read',
  'structure:read',
]

/**
 * Billing visibility/management and org deletion stay super-admin territory.
 */
const ADMIN_EXCLUDED = new Set(['billing:read', 'billing:manage', 'org:delete'])

const ADMIN: readonly string[] = ALL_ORG_PERMISSIONS_SORTED.filter(
  (permission) => !ADMIN_EXCLUDED.has(permission)
)

export interface OrgRoleDefinition {
  readonly name: string
  readonly displayName: string
  readonly description: string
  readonly permissions: readonly string[]
}

/** Canonical 876-owned role values. */
export const SUPER_ADMIN_ROLE_NAME = 'super-admin'
export const DEFAULT_MEMBER_ROLE_NAME = 'staff'

/**
 * Read-only aliases kept during the role naming cutover. New writes must use the
 * canonical values above. `owner`/`member`/`billing_manager` are the pre-three-
 * role values; `super_admin` is the underscore spelling introduced by the
 * three-role refactor before the platform naming contract was applied.
 */
const LEGACY_ORG_ROLE_ALIASES: Readonly<Record<string, string>> = {
  owner: SUPER_ADMIN_ROLE_NAME,
  super_admin: SUPER_ADMIN_ROLE_NAME,
  member: DEFAULT_MEMBER_ROLE_NAME,
  billing_manager: DEFAULT_MEMBER_ROLE_NAME,
}

export function canonicalOrgRoleName(roleName: string): string {
  return LEGACY_ORG_ROLE_ALIASES[roleName] ?? roleName
}

export function isSuperAdminRoleName(roleName: string): boolean {
  return canonicalOrgRoleName(roleName) === SUPER_ADMIN_ROLE_NAME
}

export const DEFAULT_ORG_ROLES: readonly OrgRoleDefinition[] = [
  {
    name: SUPER_ADMIN_ROLE_NAME,
    displayName: 'Super Admin',
    description:
      'Full control of the organization, including billing and deletion.',
    permissions: ALL_ORG_PERMISSIONS_SORTED,
  },
  {
    name: 'admin',
    displayName: 'Admin',
    description:
      'Manages members, roles, apps, and organization details. No billing access.',
    permissions: ADMIN,
  },
  {
    name: DEFAULT_MEMBER_ROLE_NAME,
    displayName: 'Staff',
    description: 'Default role. Views the organization directory.',
    permissions: READ_ONLY_STAFF,
  },
]

export const DEFAULT_ORG_ROLES_BY_NAME: ReadonlyMap<string, OrgRoleDefinition> =
  new Map(DEFAULT_ORG_ROLES.map((role) => [role.name, role]))

/**
 * Fallback permission resolution for legacy memberships without `role_id`.
 *
 * Unknown role names resolve to the default member permissions — the least
 * privileged role in the catalog, so an unrecognised name can only ever
 * withhold access, never widen it. Known historical role aliases are
 * canonicalized first so a rolling deployment does not accidentally demote an
 * existing super admin while the data migration is still in progress.
 */
export function defaultPermissionsForRoleName(roleName: string): string[] {
  const definition =
    DEFAULT_ORG_ROLES_BY_NAME.get(canonicalOrgRoleName(roleName)) ??
    DEFAULT_ORG_ROLES_BY_NAME.get(DEFAULT_MEMBER_ROLE_NAME)

  // The staff role is always present, so this cannot be reached — the
  // fallback keeps the return type honest without an assertion.
  if (!definition) return []

  return [...definition.permissions]
}
