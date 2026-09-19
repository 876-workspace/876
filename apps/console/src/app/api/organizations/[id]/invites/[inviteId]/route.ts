import { workspace } from '@/lib/clients/workspace'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Params = { params: Promise<{ id: string; inviteId: string }> }

/** Revokes an invite token. */
export async function DELETE(
  _request: NextRequest,
  { params }: Params
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id, inviteId } = await params
  const { data, error } = await workspace.invites.revoke(id, inviteId)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to revoke invite.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}
