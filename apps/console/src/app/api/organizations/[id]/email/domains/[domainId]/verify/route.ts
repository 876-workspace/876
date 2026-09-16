import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { createCommunications } from '@/lib/services/communications'
import { platform } from '@/lib/services/platform'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string; domainId: string }> }

/** Re-checks one sending domain's DNS verification on behalf of the operator. */
export async function POST(request: NextRequest, context: Context) {
  const { sessionUser, response } = await requireConsolePermission(
    'console:organizations'
  )
  if (response) return response

  const { id: organizationId, domainId } = await context.params

  await platform.auditEvents
    .create({
      event: 'communications.domain.verify-requested',
      appName: '876-console',
      userId: sessionUser?.id ?? null,
      properties: { organizationId, domainId },
    })
    .catch(() => null)

  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const communications = createCommunications(requestId)
  const { data, error } = await communications.domains.verify(
    organizationId,
    domainId
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to verify sending domain.' },
      { status: error?.code?.endsWith('-not-found') ? 404 : 400 }
    )
  }

  return apiJson({ data })
}
