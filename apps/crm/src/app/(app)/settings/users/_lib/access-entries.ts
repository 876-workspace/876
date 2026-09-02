import { appPermissionCatalogs } from '@876/core/access/catalogs'
import type {
  AccessAppEntry,
  AccessAppRole,
  AccessPermission,
} from '@876/access-ui/types'

import type { AppMembership, AppRole } from './types'

function roleForAccess(role: AppRole): AccessAppRole {
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

function catalogForAccess(appSlug: string): AccessPermission[] {
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

export function buildAccessEntries(
  memberships: AppMembership[],
  rolesByApp: ReadonlyMap<string, AppRole[]>
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
