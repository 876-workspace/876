import type { Member, Role } from '@/lib/db'
import { isPermission } from '@/lib/permissions'
import type { MemberAccess, RoleResource } from '@/types/access'

type RoleWithCount = Role & { _count: { members: number } }
type MemberWithRole = Member & { role: Role }

export function roleView(role: RoleWithCount): RoleResource {
  return {
    object: 'billing_role',
    id: role.id,
    slug: role.slug,
    name: role.name,
    description: role.description,
    permissions: role.permissions.filter(isPermission),
    isSystem: role.isSystem,
    isDefault: role.isDefault,
    memberCount: role._count.members,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  }
}

export function memberAccess(member: MemberWithRole): MemberAccess {
  return accessForRole(member.userId, member.status, member.role)
}

export function defaultAccess(userId: string, role: Role): MemberAccess {
  return accessForRole(userId, 'ACTIVE', role)
}

function accessForRole(
  userId: string,
  status: MemberAccess['status'],
  role: Role
): MemberAccess {
  const permissions = role.permissions.filter(isPermission)
  return {
    userId,
    status,
    permissions,
    role: {
      id: role.id,
      slug: role.slug,
      name: role.name,
      description: role.description,
      permissions,
      isSystem: role.isSystem,
      isDefault: role.isDefault,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    },
  }
}
