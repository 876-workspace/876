import type { CrmOperatorClient } from '@876/crm/operator'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import {
  requireConsoleCrmPermission,
  requireConsolePermission,
} from '@/lib/auth/route-guard'
import { createCrm } from '@/lib/clients/crm'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string; requestId: string }> }
type CreateRequestReminderInput = Parameters<
  CrmOperatorClient['requestReminders']['create']
>[2]

export async function GET(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId, requestId } = await context.params
  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const crm = createCrm(traceId)
  const { data, error } = await crm.requestReminders.list(
    organizationId,
    requestId
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to list request reminders.' },
      { status: 400 }
    )

  return apiJson({ data })
}

export async function POST(request: NextRequest, context: Context) {
  const { id: organizationId, requestId } = await context.params
  const { response } = await requireConsoleCrmPermission(
    organizationId,
    'reminders.create'
  )
  if (response) return response
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const crm = createCrm(traceId)
  const { data, error } = await crm.requestReminders.create(
    organizationId,
    requestId,
    body as CreateRequestReminderInput
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to create request reminder.' },
      { status: 400 }
    )

  return apiJson({ data }, { status: 201 })
}
