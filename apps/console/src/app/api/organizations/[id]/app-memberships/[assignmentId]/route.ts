import { workspace } from '@/lib/services/workspace'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string; assignmentId: string }> }

/**
 * A permission override list, or null when the field was not supplied.
 *
 * An empty array is a meaningful value — it clears every override — so it must
 * stay distinct from an absent field, which leaves the stored list alone.
 */
function stringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  return value.filter((entry): entry is string => typeof entry === 'string')
}

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
    permissionGrants?: unknown
    permissionDenies?: unknown
  } | null

  const appRoleId =
    typeof body?.appRoleId === 'string' ? body.appRoleId.trim() : ''
  const grants = stringList(body?.permissionGrants)
  const denies = stringList(body?.permissionDenies)

  // A role change and an override change are separate operator intents, and
  // either alone is a complete request. Requiring a role here would make it
  // impossible to adjust overrides on an assignment whose role is unchanged.
  if (!appRoleId && !grants && !denies)
    return apiJson(
      {
        error: 'appRoleId, permissionGrants, or permissionDenies is required.',
      },
      { status: 400 }
    )

  const { data, error } = await workspace.appMemberships.update(
    organizationId,
    assignmentId,
    {
      ...(appRoleId ? { app_role_id: appRoleId } : {}),
      ...(grants ? { permission_grants: grants } : {}),
      ...(denies ? { permission_denies: denies } : {}),
    }
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
