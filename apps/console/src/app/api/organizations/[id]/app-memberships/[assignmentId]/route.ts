import { workspace } from '@/lib/services/workspace'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string; assignmentId: string }> }

/** Changes the named app role assigned to an organization member. */
export async function PATCH(
  request: NextRequest,
  { params }: Params
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId, assignmentId } = await params
  const body = (await request.json().catch(() => null)) as {
    appRoleId?: unknown
  } | null
  const appRoleId =
    typeof body?.appRoleId === 'string' ? body.appRoleId.trim() : ''
  if (!appRoleId)
    return apiJson({ error: 'appRoleId is required.' }, { status: 400 })

  const { data, error } = await workspace.appMemberships.update(
    organizationId,
    assignmentId,
    { app_role_id: appRoleId }
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to update app role.' },
      { status: 400 }
    )

  return apiJson({ data })
}

/** Revokes an organization member's product-app role assignment. */
export async function DELETE(
  _request: NextRequest,
  { params }: Params
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId, assignmentId } = await params
  const { data, error } = await workspace.appMemberships.delete(
    organizationId,
    assignmentId
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to revoke app role.' },
      { status: 400 }
    )

  return apiJson({ data })
}
