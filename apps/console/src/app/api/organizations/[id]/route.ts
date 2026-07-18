import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

/** Updates an organization's fields. Pure transport over `$876.orgs.update`. */
export async function PATCH(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { data, error } = await $876.orgs.update(id, body)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to update organization.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}

/**
 * Soft-deletes an organization. The record is retained and visible to admins.
 * To permanently remove a record use `DELETE /api/organizations/[id]/purge`.
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

  const { data, error } = await $876.orgs.delete(id, { deletedBy: caller.id })
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to delete organization.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}
