import { workspace } from '@/lib/clients/workspace'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string; assignmentId: string }> }

/** Revokes an app assignment for an organization member. */
export async function DELETE(
  _request: NextRequest,
  { params }: Params
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id, assignmentId } = await params
  const { data, error } = await workspace.appAssignments.revoke(
    id,
    assignmentId
  )

  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to revoke app assignment.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}
