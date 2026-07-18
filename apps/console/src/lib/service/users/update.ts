import type { AdminUser, AdminUserUpdateParams } from '@876/admin'

import { $876 } from '@/lib/876'
import { assertRoleChangeAllowed } from '@/lib/auth/role-change'
import type { Access } from '@/types/auth'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Update a platform user; role changes are escalation-checked first. */
export async function update(
  id: string,
  body: AdminUserUpdateParams,
  caller?: Access
): ServiceResult<AdminUser> {
  if (caller && typeof (body as { role?: unknown }).role === 'string') {
    const check = await assertRoleChangeAllowed(
      caller,
      id,
      (body as { role: string }).role
    )
    if (!check.ok) return err(check.error, check.status)
  }

  const { data, error } = await $876.users.update(id, body)
  if (error || !data) return err(error?.message ?? 'Failed to update user.')

  return ok(data)
}
