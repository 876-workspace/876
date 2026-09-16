import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { integration } from '@/lib/services/integration'

export const runtime = 'nodejs'

type Context = { params: Promise<{ deliveryId: string }> }

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/tenant-not-found' ||
    code === 'projects/webhook-delivery-not-found' ||
    code === 'projects/webhook-endpoint-not-found'
    ? 404
    : 400
}

export async function POST(_request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { deliveryId } = await params
  const result = await integration.replayWebhookDelivery(
    decodeURIComponent(deliveryId),
    { organizationId: auth.orgId }
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The delivery could not be replayed.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
