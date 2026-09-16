import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { createCommunications } from '@/lib/services/communications'
import { platform } from '@/lib/services/platform'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string; deliveryId: string }> }

/**
 * Retrieves one delivery record with its evidence. The record carries the
 * recipient address and the rendered subject and body, so this read is
 * customer-identifying and is always audited.
 */
export async function GET(request: NextRequest, context: Context) {
  const { sessionUser, response } = await requireConsolePermission(
    'console:organizations'
  )
  if (response) return response

  const { id: organizationId, deliveryId } = await context.params

  await platform.auditEvents
    .create({
      event: 'communications.delivery.viewed',
      appName: '876-console',
      userId: sessionUser?.id ?? null,
      properties: { organizationId, deliveryId },
    })
    .catch(() => null)

  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const communications = createCommunications(requestId)
  const { data, error } = await communications.deliveries.retrieve(
    organizationId,
    deliveryId
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to retrieve email delivery.' },
      { status: error?.code?.endsWith('-not-found') ? 404 : 400 }
    )
  }

  return apiJson({ data })
}
