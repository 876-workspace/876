import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
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
  const { data, error } = await $876.appAssignments.admin.revoke(
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
