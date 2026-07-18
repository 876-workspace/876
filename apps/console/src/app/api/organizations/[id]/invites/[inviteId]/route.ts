import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
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
  const { data, error } = await $876.orgs.revokeInvite(id, inviteId)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to revoke invite.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}
