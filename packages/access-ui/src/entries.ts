import { appPermissionCatalogs } from '@876/core/access/catalogs'

import type { AccessAppEntry, AccessAppRole, AccessPermission } from './types'

/**
 * The wire shapes this module reads.
 *
 * They are structural rather than imported from a client package: every host
 * reaches app access through a different caller entrypoint — Console's
 * operator client, CRM's and Invoice's session clients — and the fields below
 * are the ones every one of those serializers returns. Depending on one host's
 * client type here would make this module refuse the others.
 */
export type AccessRoleInput = {
  id: string
  key: string
  name: string
  description: string | null
  permissions: string[]
  is_system: boolean
  is_default: boolean
}

export type AccessMembershipInput = {
  id: string
  app_id: string
  app_slug: string
  app_name: string
  entitled: boolean
  assigned: boolean
  status: string
  app_role: AccessRoleInput | null
  permission_grants: string[]
  permission_denies: string[]
  effective_permissions: string[]
}

/** Serialized app role to the shape the access surfaces render. */
export function roleForAccess(role: AccessRoleInput): AccessAppRole {
  return {
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    isSystem: role.is_system,
    isDefault: role.is_default,
  }
}

/**
 * The declared permission catalog for one app, flattened with its module
 * labels.
 *
 * An app with no registered catalog yields an empty list rather than throwing:
 * a product may be entitled before its catalog is declared, and that is a
 * "nothing to show" state, not a failure.
 */
export function catalogForAccess(appSlug: string): AccessPermission[] {
  const catalog = appPermissionCatalogs[appSlug]
  if (!catalog) return []

  const labels = new Map(
    catalog.modules.map((module) => [module.key, module.label])
  )

  return catalog.permissions.map((permission) => ({
    key: permission.key,
    moduleKey: permission.moduleKey,
    moduleLabel: labels.get(permission.moduleKey) ?? '',
    action: permission.action,
    label: permission.label,
    isDangerous: permission.isDangerous ?? false,
  }))
}

/**
 * Builds the entries the access panel and summary render.
 *
 * `effectivePermissions` is passed through untouched — the owning API has
 * already resolved role ∪ grants − denies against the live catalog, and
 * recomputing it here would be a second authorization answer that could
 * disagree with the one the API enforces.
 */
export function buildAccessEntries(
  memberships: readonly AccessMembershipInput[],
  rolesByApp: ReadonlyMap<string, readonly AccessRoleInput[]>
): AccessAppEntry[] {
  return memberships.map((membership) => ({
    assignmentId: membership.assigned ? membership.id : null,
    appId: membership.app_id,
    appSlug: membership.app_slug,
    appName: membership.app_name,
    entitled: membership.entitled,
    assigned: membership.assigned,
    status: membership.status,
    role: membership.app_role ? roleForAccess(membership.app_role) : null,
    roles: (rolesByApp.get(membership.app_id) ?? []).map(roleForAccess),
    grants: membership.permission_grants,
    denies: membership.permission_denies,
    effectivePermissions: membership.effective_permissions,
    catalog: catalogForAccess(membership.app_slug),
  }))
}
