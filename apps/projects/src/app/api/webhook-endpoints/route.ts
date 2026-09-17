import 'server-only'

import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireApiAccess, type ApiContext } from '@/lib/auth/api-permission'
import { createWebhookEndpointInputSchema } from '@/types/integrations'
import { integration } from '@/lib/services/integration'

export const runtime = 'nodejs'

function errorStatus(code: string): 400 | 404 {
  return code === 'projects/tenant-not-found' ||
    code === 'projects/webhook-endpoint-not-found'
    ? 404
    : 400
}

export async function GET() {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.view',
  })
  if (auth.response) return auth.response

  const result = await integration.listWebhookEndpoints()
  if (result.error || !result.data)
    return apiJson(
      {
        error:
          result.error?.message ?? 'Webhook endpoints could not be loaded.',
      },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data })
}

export async function POST(request: NextRequest) {
  const auth: ApiContext = await requireApiAccess({
    module: 'projects',
    permission: 'projects.edit',
  })
  if (auth.response) return auth.response

  const body = await request.json().catch(() => null)
  const parsed = createWebhookEndpointInputSchema.safeParse(body)
  if (!parsed.success)
    return apiJson(
      { error: 'Enter a valid https URL and at least one event type.' },
      { status: 422 }
    )

  const result = await integration.createWebhookEndpoint({
    url: parsed.data.url,
    eventTypes: [...parsed.data.eventTypes],
    ...(parsed.data.secret !== undefined ? { secret: parsed.data.secret } : {}),
    ...(parsed.data.enabled !== undefined
      ? { enabled: parsed.data.enabled }
      : {}),
  })
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'The endpoint could not be created.' },
      { status: errorStatus(result.error?.code ?? '') }
    )

  return apiJson({ data: result.data }, { status: 201 })
}
