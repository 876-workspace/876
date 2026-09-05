import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { assertTeamGrantChangeAllowed } from '@/lib/auth/role-change'
import { requireConsolePermission } from '@/lib/auth/route-guard'
import { errorResponse } from '@/lib/errors'
import { service } from '@/lib/service'
import { teamGrantUpdateSchema } from '@/types/team'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

/** Update one Console access grant without exposing the local datastore. */
export async function PATCH(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const body = teamGrantUpdateSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!body.success) {
    const hasInvalidRoleName = body.error.issues.some(
      (issue) => issue.path[0] === 'roleName'
    )
    return errorResponse(
      hasInvalidRoleName ? 'team/role-invalid' : 'error/bad-request'
    )
  }

  const updatesGrant =
    body.data.roleName !== undefined ||
    body.data.affiliation !== undefined ||
    body.data.title !== undefined ||
    body.data.expiresAt !== undefined ||
    body.data.justification !== undefined
  const authorization = await requireConsolePermission(
    updatesGrant ? 'team:update' : 'team:suspend'
  )
  if (authorization.response) return authorization.response

  if (updatesGrant && body.data.status !== undefined) {
    const suspensionAuthorization =
      await requireConsolePermission('team:suspend')
    if (suspensionAuthorization.response)
      return suspensionAuthorization.response
  }

  const { id } = await context.params
  const change = await assertTeamGrantChangeAllowed(
    authorization.caller,
    id,
    body.data
  )
  if (!change.ok) return errorResponse(change.code)

  const { expiresAt, ...updates } = body.data
  const result = await service.team.update(id, {
    ...updates,
    ...(expiresAt !== undefined
      ? { expiresAt: expiresAt === null ? null : BigInt(expiresAt) }
      : {}),
  })
  if (result.error)
    return apiJson({ data: null, error: result.error }, { status: 400 })

  return apiJson({ data: { userId: result.data.userId } })
}

/** Revoke one Console access grant. */
export async function DELETE(
  _request: NextRequest,
  context: Context
): Promise<Response> {
  const { caller, response } = await requireConsolePermission('team:revoke')
  if (response) return response

  const { id } = await context.params
  const change = await assertTeamGrantChangeAllowed(caller, id, {
    revoke: true,
  })
  if (!change.ok) return errorResponse(change.code)

  const result = await service.team.delete(id)
  return apiJson({ data: { count: result.count } })
}
