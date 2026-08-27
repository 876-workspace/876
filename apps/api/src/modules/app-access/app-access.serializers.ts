import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '@/platform/timestamps'

import type {
  AppMembership,
  AppPermission,
  AppRole,
} from './app-access.schemas'

export type AppPermissionRow = {
  id: string
  appId: string
  key: string
  moduleKey: string
  action: string
  label: string
  description: string | null
  isDangerous: boolean
  position: number
  createdAt: bigint
  updatedAt: bigint
}

export type AppRoleRow = {
  id: string
  appId: string
  organizationId: string | null
  key: string
  name: string
  description: string | null
  permissions: string[]
  isSystem: boolean
  isDefault: boolean
  templateKey: string | null
  position: number
  deletedAt: bigint | null
  deletedBy: string | null
  deletionReason: string | null
  createdAt: bigint
  updatedAt: bigint
}

export type AppAssignmentRow = {
  id: string
  organizationId: string
  userId: string
  appId: string
  appRoleId: string | null
  status: string
  permissionGrants: string[]
  permissionDenies: string[]
  title: string | null
  attributes: unknown | null
  assignedBy: string | null
  assignedAt: bigint | null
  lastAccessAt: bigint | null
  revokedAt: bigint | null
  revokedBy: string | null
  deletedAt: bigint | null
  deletedBy: string | null
  deletionReason: string | null
  createdAt: bigint
  updatedAt: bigint
  appRole?: AppRoleRow | null
}

export function serializeAppPermission(row: AppPermissionRow): AppPermission {
  return {
    object: 'app_permission',
    id: row.id,
    app_id: row.appId,
    key: row.key,
    module_key: row.moduleKey,
    action: row.action,
    label: row.label,
    description: row.description,
    is_dangerous: row.isDangerous,
    position: row.position,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeAppRole(
  row: AppRoleRow,
  membersCount: number | null = null
): AppRole {
  return {
    object: 'app_role',
    id: row.id,
    app_id: row.appId,
    organization_id: row.organizationId,
    key: row.key,
    name: row.name,
    description: row.description,
    permissions: [...row.permissions].sort(),
    is_system: row.isSystem,
    is_default: row.isDefault,
    template_key: row.templateKey,
    position: row.position,
    members_count: membersCount,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeAppMembership(params: {
  assignment: AppAssignmentRow | null
  organizationId: string
  membershipId: string
  userId: string
  app: { id: string; slug: string; name: string }
  entitled: boolean
  assigned: boolean
  role: AppRoleRow | null
  permissions: string[]
}): AppMembership {
  const assignment = params.assignment
  return {
    object: 'app_membership',
    id:
      assignment?.id ??
      `asg_unassigned_${params.membershipId}_${params.app.id}`,
    organization_id: params.organizationId,
    user_id: params.userId,
    membership_id: params.membershipId,
    app_id: params.app.id,
    app_slug: params.app.slug,
    app_name: params.app.name,
    status: assignment?.status ?? 'unassigned',
    assigned: params.assigned,
    entitled: params.entitled,
    app_role: params.role ? serializeAppRole(params.role, null) : null,
    permission_grants: [...(assignment?.permissionGrants ?? [])].sort(),
    permission_denies: [...(assignment?.permissionDenies ?? [])].sort(),
    effective_permissions: [...params.permissions].sort(),
    title: assignment?.title ?? null,
    attributes:
      assignment?.attributes &&
      typeof assignment.attributes === 'object' &&
      !Array.isArray(assignment.attributes)
        ? (assignment.attributes as Record<string, unknown>)
        : null,
    assigned_by: assignment?.assignedBy ?? null,
    assigned_at: nullableFromDbUnixSeconds(assignment?.assignedAt ?? null),
    last_access_at: nullableFromDbUnixSeconds(assignment?.lastAccessAt ?? null),
    revoked_at: nullableFromDbUnixSeconds(assignment?.revokedAt ?? null),
    created_at: assignment ? fromDbUnixSeconds(assignment.createdAt) : null,
    updated_at: assignment ? fromDbUnixSeconds(assignment.updatedAt) : null,
  }
}
