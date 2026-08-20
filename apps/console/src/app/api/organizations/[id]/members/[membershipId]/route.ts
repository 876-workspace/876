import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string; membershipId: string }> }

/** Updates a member's role or status in an organization. */
export async function PATCH(
  request: NextRequest,
  { params }: Params
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { membershipId } = await params
  const body = (await request.json().catch(() => null)) as {
    role?: string
    status?: string
  } | null

  if (!body?.role && !body?.status) {
    return apiJson({ error: 'role or status is required.' }, { status: 400 })
  }

  const { data, error } = await $876.memberships.admin.update(membershipId, {
    ...(body.role ? { role: body.role } : {}),
    ...(body.status ? { status: body.status } : {}),
  })

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

  const { membershipId } = await params
  const { data, error } = await $876.memberships.admin.delete(membershipId)

  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to remove member.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}
