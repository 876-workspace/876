import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { createCommunications } from '@/lib/clients/communications'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string; domainId: string }> }

/** Retrieves one sending domain, including its DNS records, for repair. */
export async function GET(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId, domainId } = await context.params

  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const communications = createCommunications(requestId)
  const { data, error } = await communications.domains.retrieve(
    organizationId,
    domainId
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to retrieve sending domain.' },
      { status: error?.code?.endsWith('-not-found') ? 404 : 400 }
    )
  }

  return apiJson({ data })
}
