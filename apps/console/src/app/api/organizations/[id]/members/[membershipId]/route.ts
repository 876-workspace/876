import { workspace } from '@/lib/services/workspace'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string; membershipId: string }> }

/** Updates a member's organization role. */
export async function PATCH(
  request: NextRequest,
  { params }: Params
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id, membershipId } = await params
  const body = (await request.json().catch(() => null)) as {
    role?: unknown
  } | null
  const role = typeof body?.role === 'string' ? body.role.trim() : ''

  if (!role) {
    return apiJson({ error: 'role is required.' }, { status: 400 })
  }

  // Keep Console on the organization-scoped access path. Besides preventing a
  // membership ID from another org being mutated through this route, this path
  // enforces the super-admin elevation invariant in the Core API.
  const { data, error } = await workspace.members.update(
    id,
    membershipId,
    { role }
  )

  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to update member.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}

/** Removes (soft-deletes) a member from an organization. */
export async function DELETE(
  _request: NextRequest,
  { params }: Params
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id, membershipId } = await params
  const { data, error } = await workspace.members.delete(
    id,
    membershipId
  )

  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to remove member.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}
