import {
  applyRoleChange,
  assertRoleChangeAllowed,
} from '@/lib/auth/role-change'
import type { Access, RoleChangeResult } from '@/types/auth'
import type { AssignableRole } from '@/types/role'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Change a user's Console role (team access grant), escalation-checked. */
export async function setRole(
  targetId: string,
  role: string,
  caller: Access
): ServiceResult<RoleChangeResult> {
  const check = await assertRoleChangeAllowed(caller, targetId, role)
  if (!check.ok) return err(check.error, check.status)

  const result = await applyRoleChange(targetId, role as AssignableRole)
  if (result.error) return err(result.error.message, 400)

  return ok(result.data)
}
