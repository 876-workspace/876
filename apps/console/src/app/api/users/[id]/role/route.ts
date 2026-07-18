import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

/**
 * Sets a user's Console access grant. Writes Console's own DB
 * (`@/lib/db`) — `'user'` revokes access, any other role grants/changes it.
 * The identity API is not touched.
 */
export async function PATCH(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { caller, response } = await requireConsolePermission('console:users')
  if (response) return response

  const { id } = await context.params
  const body = (await request.json().catch(() => null)) as {
    role?: string
  } | null
  if (!body?.role) {
    return apiJson(
      {
        error:
          'Invalid role. Must be user, staff, admin, owner, or super_admin.',
      },
      { status: 400 }
    )
  }

  const result = await service.users.setRole(id, body.role, caller)
  if (result.error) {
    return apiJson({ error: result.error }, { status: result.status ?? 400 })
  }
  return apiJson({ data: result.data })
}
