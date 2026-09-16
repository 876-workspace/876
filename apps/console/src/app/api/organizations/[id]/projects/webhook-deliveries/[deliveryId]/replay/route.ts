import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { createProjects } from '@/lib/services/projects'
import { platform } from '@/lib/services/platform'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string; deliveryId: string }> }

/**
 * Replays one failed webhook delivery.
 *
 * Operator tier: the Console permission is the whole authorization decision,
 * the audit event is written before the operator client is touched, and the
 * client is called exactly once.
 */
export async function POST(request: NextRequest, context: Context) {
  const { id: organizationId, deliveryId } = await context.params
  const { sessionUser, response } =
    await requireConsolePermission('console:organizations')
  if (response) return response

  await platform.auditEvents
    .create({
      event: 'projects.webhook-delivery.replayed',
      appName: '876-console',
      userId: sessionUser?.id ?? null,
      properties: { organizationId, deliveryId },
    })
    .catch(() => null)

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const projects = createProjects(traceId)
  const { data, error } = await projects.webhookEndpoints.replay(
    deliveryId,
    { organizationId }
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to replay webhook delivery.' },
      { status: error?.code?.endsWith('-not-found') ? 404 : 400 }
    )

  return apiJson({ data })
}
