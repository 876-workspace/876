import { workspace } from '@/lib/services/workspace'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string }> }

/** Assigns an entitled product app role to an organization member. */
export async function POST(
  request: NextRequest,
  { params }: Params
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId } = await params
  const body = (await request.json().catch(() => null)) as {
    membershipId?: unknown
    appId?: unknown
    appRoleId?: unknown
  } | null
  const membershipId =
    typeof body?.membershipId === 'string' ? body.membershipId.trim() : ''
  const appId = typeof body?.appId === 'string' ? body.appId.trim() : ''
  const appRoleId =
    typeof body?.appRoleId === 'string' ? body.appRoleId.trim() : ''
  if (!membershipId || !appId || !appRoleId)
    return apiJson(
      { error: 'membershipId, appId, and appRoleId are required.' },
      { status: 400 }
    )

  const { data, error } = await workspace.appMemberships.create(
    organizationId,
    {
      membership_id: membershipId,
      app_id: appId,
      app_role_id: appRoleId,
    }
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to assign app role.' },
      { status: 400 }
    )

  return apiJson({ data }, { status: 201 })
}
