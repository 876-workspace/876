import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { integration } from '@/lib/services/integration'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ clientId: string }> }

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/tenant-not-found' ||
    code === 'projects/integration-client-not-found'
    ? 404
    : 400
}

export async function POST(_request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { clientId } = await params
  const result = await integration.revokeClient(
    decodeURIComponent(clientId),
    auth.orgId
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The client could not be revoked.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
