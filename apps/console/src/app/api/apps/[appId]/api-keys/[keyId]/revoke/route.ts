import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Params = { params: Promise<{ appId: string; keyId: string }> }

/** Revokes an API key (marks it as inactive, does not delete). */
export async function POST(
  _request: NextRequest,
  { params }: Params
): Promise<Response> {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { appId, keyId } = await params
  const { data, error } = await $876.apiKeys.revoke(appId, keyId)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to revoke API key.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}
