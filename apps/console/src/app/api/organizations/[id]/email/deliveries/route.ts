import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { createCommunications } from '@/lib/clients/communications'
import { platform } from '@/lib/clients/platform'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

/**
 * Lists an organization's delivery history. Delivery rows carry the recipient
 * address and the rendered subject, so this read is customer-identifying and
 * is always audited.
 */
export async function GET(request: NextRequest, context: Context) {
  const { sessionUser, response } = await requireConsolePermission(
    'console:organizations'
  )
  if (response) return response

  const { id: organizationId } = await context.params

  await platform.auditEvents
    .create({
      event: 'communications.deliveries.viewed',
      appName: '876-console',
      userId: sessionUser?.id ?? null,
      properties: { organizationId },
    })
    .catch(() => null)

  const limitParam = request.nextUrl.searchParams.get('limit')
  const limit = limitParam === null ? Number.NaN : Number(limitParam)
  const query = Number.isInteger(limit) && limit > 0 ? { limit } : {}

  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const communications = createCommunications(requestId)
  const { data, error } = await communications.deliveries.list(
    organizationId,
    query
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to list email deliveries.' },
      { status: 400 }
    )
  }

  return apiJson({ data })
}
