import 'server-only'

import { getError } from '@/lib/errors'
import {
  canonicalConsoleRole,
  CONSOLE_SUPER_ADMIN_ROLE,
} from '@/lib/permissions'
import { team } from '@/lib/service/team'
import type { TeamServiceResult } from '@/lib/service/team/validation'
import type {
  Access,
  RoleCheckResult,
  RoleChangeResult,
  TeamGrantChangeResult,
} from '@/types/auth'
import { ASSIGNABLE_ROLES, type AssignableRole } from '@/types/role'
import type { TeamGrantUpdate } from '@/types/team'

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

  const target = await team.retrieve(targetUserId)
  if (
    !target &&
    normalizedRole === CONSOLE_SUPER_ADMIN_ROLE &&
    canonicalConsoleRole(caller.role) !== CONSOLE_SUPER_ADMIN_ROLE
  ) {
    return {
      ok: false,
      error: `Only a super admin can grant the ${normalizedRole} role.`,
      status: 403,
    }
  }

  if (!target) return { ok: true }

  const check = await evaluateTeamGrantChange(caller, targetUserId, target, {
    roleName: normalizedRole,
  })
  if (!check.ok) {
    const error = getError(check.code)
    return {
      ok: false,
      error: error.message,
      status: error.httpStatus === 409 ? 409 : 403,
    }
  }

  return { ok: true }
}

/** Applies self-access and super-admin escalation safeguards to grant mutations. */
export async function assertTeamGrantChangeAllowed(
  caller: Access,
  targetUserId: string,
  change: Pick<TeamGrantUpdate, 'roleName' | 'status'> | { revoke: true }
): Promise<TeamGrantChangeResult> {
  const target = await team.retrieve(targetUserId)
  if (!target) return { ok: true }

  return evaluateTeamGrantChange(caller, targetUserId, target, change)
}

async function evaluateTeamGrantChange(
  caller: Access,
  targetUserId: string,
  target: NonNullable<Awaited<ReturnType<typeof team.retrieve>>>,
  change: Pick<TeamGrantUpdate, 'roleName' | 'status'> | { revoke: true }
): Promise<TeamGrantChangeResult> {
  const targetRole = canonicalConsoleRole(target.roleName)
  const requestedRole =
    'roleName' in change && change.roleName
      ? canonicalConsoleRole(change.roleName)
      : targetRole
  const revoking = 'revoke' in change
  const suspending = 'status' in change && change.status === 'suspended'
  const changesRole = requestedRole !== targetRole

  if (
    requestedRole === CONSOLE_SUPER_ADMIN_ROLE &&
    canonicalConsoleRole(caller.role) !== CONSOLE_SUPER_ADMIN_ROLE
  )
    return { ok: false, code: 'team/role-forbidden' }

  if (targetUserId === caller.id && (revoking || suspending || changesRole))
    return { ok: false, code: 'team/self-access-protected' }

  if (
    targetRole === CONSOLE_SUPER_ADMIN_ROLE &&
    canonicalConsoleRole(caller.role) !== CONSOLE_SUPER_ADMIN_ROLE
  )
    return { ok: false, code: 'team/target-protected' }

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
