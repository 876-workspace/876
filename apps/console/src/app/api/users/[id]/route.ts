import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

/** Updates a user's profile fields. */
export async function PATCH(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { caller, response } = await requireConsolePermission('console:users')
  if (response) return response

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })
  }

  const result = await service.users.update(id, body, caller)
  if (result.error) {
    return apiJson({ error: result.error }, { status: result.status ?? 400 })
  }
  return apiJson({ data: result.data })
}

/**
 * Soft-deletes a user. The record is retained and visible to admins.
 * To permanently remove a record use `DELETE /api/users/[id]/purge`.
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
  const result = await service.users.delete(id, caller)
  if (result.error) {
    return apiJson({ error: result.error }, { status: result.status ?? 400 })
  }
  return apiJson({ data: result.data })
}
