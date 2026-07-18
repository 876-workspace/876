import 'server-only'

import { team } from '@/lib/service/team'
import type { Access, RoleCheckResult, RoleChangeResult } from '@/types/auth'
import { ASSIGNABLE_ROLES, type AssignableRole } from '@/types/role'

function isAssignableRole(value: string): value is AssignableRole {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(value)
}

export async function assertRoleChangeAllowed(
  caller: Access,
  targetUserId: string,
  requestedRole: string
): Promise<RoleCheckResult> {
  if (!isAssignableRole(requestedRole)) {
    return {
      ok: false,
      error: 'Invalid role. Must be user, staff, admin, owner, or super_admin.',
      status: 400,
    }
  }

  if (caller.role === 'super_admin') return { ok: true }

  if (requestedRole === 'super_admin' || requestedRole === 'owner') {
    return {
      ok: false,
      error: `Only a super admin can grant the ${requestedRole} role.`,
      status: 403,
    }
  }

  const target = await team.retrieve(targetUserId)
  if (target?.roleName === 'super_admin' || target?.roleName === 'owner') {
    return {
      ok: false,
      error: `Only a super admin can change a ${target.roleName}'s role.`,
      status: 403,
    }
  }

  return { ok: true }
}

export async function applyRoleChange(
  targetUserId: string,
  requestedRole: AssignableRole
): Promise<RoleChangeResult> {
  if (requestedRole === 'user') {
    await team.delete(targetUserId)
    return { userId: targetUserId, role: 'user', revoked: true }
  }

  const existing = await team.retrieve(targetUserId)
  const row = existing
    ? await team.update(targetUserId, { roleName: requestedRole })
    : await team.create(targetUserId, requestedRole)
  return {
    userId: row.userId,
    role: row.roleName,
    revoked: false,
  }
}
