import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

/** Revoke one Console access grant. */
export async function DELETE(
  _request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('team:revoke')
  if (response) return response

  const { id } = await context.params
  const result = await service.team.delete(id)
  return apiJson({ data: { count: result.count } })
}
