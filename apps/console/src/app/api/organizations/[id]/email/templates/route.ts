import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { createCommunications } from '@/lib/services/communications'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

/** Lists an organization's email templates for operator inspection. */
export async function GET(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId } = await context.params

  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const communications = createCommunications(requestId)
  const { data, error } = await communications.templates.list(organizationId)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to list email templates.' },
      { status: 400 }
    )
  }

  return apiJson({ data })
}
