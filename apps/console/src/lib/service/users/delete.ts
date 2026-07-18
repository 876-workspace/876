import type { AdminDeletedUser } from '@876/admin'

import { $876 } from '@/lib/876'
import type { Access } from '@/types/auth'
import type { ServiceResult } from '@/types/api'

import { err, ok } from '../result'

/** Soft-delete a platform user, recording the acting Console user. */
export async function deleteUser(
  id: string,
  caller: Access
): ServiceResult<AdminDeletedUser> {
  const { data, error } = await $876.users.delete(id, { deletedBy: caller.id })
  if (error || !data) return err(error?.message ?? 'Failed to delete user.')

  return ok(data)
}
