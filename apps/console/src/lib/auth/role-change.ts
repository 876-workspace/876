import 'server-only'

import { canonicalConsoleRole, CONSOLE_SUPER_ADMIN_ROLE } from '@/lib/permissions'
import { team } from '@/lib/service/team'
import type { TeamServiceResult } from '@/lib/service/team/validation'
import type { Access, RoleCheckResult, RoleChangeResult } from '@/types/auth'
import { ASSIGNABLE_ROLES, type AssignableRole } from '@/types/role'

function normalizeAssignableRole(value: string): AssignableRole | null {
  const normalized = canonicalConsoleRole(value)
  return (ASSIGNABLE_ROLES as readonly string[]).includes(normalized)
    ? (normalized as AssignableRole)
    : null
}

export async function assertRoleChangeAllowed(
  caller: Access,
  targetUserId: string,
  requestedRole: string
): Promise<RoleCheckResult> {
  const normalizedRole = normalizeAssignableRole(requestedRole)
  if (!normalizedRole) {
    return {
      ok: false,
      error: 'Invalid role. Must be user, staff, admin, or super-admin.',
      status: 400,
    }
  }

  if (canonicalConsoleRole(caller.role) === CONSOLE_SUPER_ADMIN_ROLE)
    return { ok: true }

  if (normalizedRole === CONSOLE_SUPER_ADMIN_ROLE) {
    return {
      ok: false,
      error: `Only a super admin can grant the ${normalizedRole} role.`,
      status: 403,
    }
  }

  const target = await team.retrieve(targetUserId)
  if (
    target?.roleName &&
    canonicalConsoleRole(target.roleName) === CONSOLE_SUPER_ADMIN_ROLE
  ) {
    return {
      ok: false,
      error: 'Only a super admin can change a super-admin role.',
      status: 403,
    }
  }

  return { ok: true }
}

export async function applyRoleChange(
  targetUserId: string,
  requestedRole: AssignableRole
): Promise<TeamServiceResult<RoleChangeResult>> {
  if (requestedRole === 'user') {
    await team.delete(targetUserId)
    return {
      data: { userId: targetUserId, role: 'user', revoked: true },
      error: null,
    }
  }

  const existing = await team.retrieve(targetUserId)
  const result = existing
    ? await team.update(targetUserId, { roleName: requestedRole })
    : await team.create(targetUserId, requestedRole)
  if (result.error) return result

  return {
    data: {
      userId: result.data.userId,
      role: canonicalConsoleRole(result.data.roleName),
      revoked: false,
    },
    error: null,
  }
}
