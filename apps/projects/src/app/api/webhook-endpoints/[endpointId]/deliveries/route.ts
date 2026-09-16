import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { listWebhookDeliveriesQuerySchema } from '@/lib/integration-inputs'
import { integration } from '@/lib/services/integration'

export const runtime = 'nodejs'

type Context = { params: Promise<{ endpointId: string }> }

export async function GET(request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const { endpointId } = await params
  const query = Object.fromEntries(new URL(request.url).searchParams.entries())
  const parsed = listWebhookDeliveriesQuerySchema.safeParse({
    ...query,
    endpointId: decodeURIComponent(endpointId),
  })
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid delivery query.' }, { status: 422 })

  const result = await integration.listWebhookDeliveries({
    endpointId: parsed.data.endpointId,
    ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    ...(parsed.data.limit !== undefined ? { limit: parsed.data.limit } : {}),
  })
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Deliveries could not be loaded.' },
      { status: 400 }
    )

  return apiJson({ data: result.data })
}
