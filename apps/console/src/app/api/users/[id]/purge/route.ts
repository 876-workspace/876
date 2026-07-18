import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

/**
 * Permanently removes a user record from the database. Cannot be undone.
 * For soft-delete (retains the record), use `DELETE /api/users/[id]` instead.
 *
 * Gated on `console:danger_zone` (super_admin only).
 */
export async function DELETE(
  _request: NextRequest,
  context: Context
): Promise<Response> {
  const { caller, response } = await requireConsolePermission(
    'console:danger_zone'
  )
  if (response) return response

  const { id } = await context.params

  const { data, error } = await $876.users.purge(id, { deletedBy: caller.id })
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to purge user.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}
