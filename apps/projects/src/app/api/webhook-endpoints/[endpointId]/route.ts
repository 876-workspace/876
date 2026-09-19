import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess } from '@/lib/auth/api-permission'
import { updateWebhookEndpointInputSchema } from '@/types/integrations'
import { integration } from '@/lib/clients/integration'
import type { ApiContext } from '@/types/access'

export const runtime = 'nodejs'

type Context = { params: Promise<{ endpointId: string }> }

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/tenant-not-found' ||
    code === 'projects/webhook-endpoint-not-found'
    ? 404
    : 400
}

export async function GET(_request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const { endpointId } = await params
  const result = await integration.retrieveWebhookEndpoint(
    decodeURIComponent(endpointId)
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The endpoint could not be loaded.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = updateWebhookEndpointInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson({ error: 'Enter a valid endpoint update.' }, { status: 422 })

  const { endpointId } = await params
  const result = await integration.updateWebhookEndpoint(
    decodeURIComponent(endpointId),
    {
      ...(parsed.data.url !== undefined ? { url: parsed.data.url } : {}),
      ...(parsed.data.eventTypes !== undefined
        ? { eventTypes: [...parsed.data.eventTypes] }
        : {}),
      ...(parsed.data.secret !== undefined
        ? { secret: parsed.data.secret }
        : {}),
      ...(parsed.data.enabled !== undefined
        ? { enabled: parsed.data.enabled }
        : {}),
    }
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The endpoint could not be updated.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const { endpointId } = await params
  const result = await integration.removeWebhookEndpoint(
    decodeURIComponent(endpointId)
  )
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The endpoint could not be deleted.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}
