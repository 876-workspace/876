import { fromDbUnixSeconds } from '@/platform/timestamps'

import type {
  AppAssignment,
  OrganizationMember,
  OrganizationMemberMe,
  OrganizationRole,
} from './access.schemas'

export type OrganizationRoleRow = {
  id: string
  organizationId: string
  name: string
  displayName: string
  description: string | null
  permissions: string[]
  isSystem: boolean
  createdAt: bigint
  updatedAt: bigint
}

export type MembershipRow = {
  id: string
  organizationId: string
  userId: string
  role: string
  roleId: string | null
  status: string
  createdAt: bigint
  user?: {
    firstName: string | null
    lastName: string | null
    email: string | null
    avatar: string | null
  } | null
}

export type AppAssignmentRow = {
  id: string
  organizationId: string
  userId: string
  appId: string
  status: string
  assignedBy: string | null
  createdAt: bigint
  updatedAt: bigint
  app?: { slug: string | null; name: string | null } | null
}

export function serializeOrganizationRole(
  row: OrganizationRoleRow,
  membersCount: number | null = null
): OrganizationRole {
  return {
    object: 'organization_role',
    id: row.id,
    organization_id: row.organizationId,
    name: row.name,
    display_name: row.displayName,
    description: row.description,
    permissions: [...row.permissions],
    is_system: row.isSystem,
    members_count: membersCount,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeOrganizationMember(
  row: MembershipRow
): OrganizationMember {
  return {
    object: 'organization_member',
    id: row.id,
    user_id: row.userId,
    role: row.role,
    role_id: row.roleId,
    status: row.status,
    first_name: row.user?.firstName ?? null,
    last_name: row.user?.lastName ?? null,
    email: row.user?.email ?? null,
    avatar: row.user?.avatar ?? null,
    created_at: fromDbUnixSeconds(row.createdAt),
  }
}

export function serializeOrganizationMemberMe(
  row: MembershipRow,
  permissions: string[]
): OrganizationMemberMe {
  return {
    ...serializeOrganizationMember(row),
    permissions: [...permissions].sort(),
  }
}

export function serializeAppAssignment(row: AppAssignmentRow): AppAssignment {
  return {
    object: 'app_assignment',
    id: row.id,
    organization_id: row.organizationId,
    user_id: row.userId,
    app_id: row.appId,
    app_slug: row.app?.slug ?? null,
    app_name: row.app?.name ?? null,
    status: row.status,
    assigned_by: row.assignedBy,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
