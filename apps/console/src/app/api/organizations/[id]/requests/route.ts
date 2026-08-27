import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { createConsole876Client } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'
import type { Console876Client } from '@/lib/876'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }
type RequestsResource = Console876Client['requests']
type CreateRequestInput = Parameters<RequestsResource['create']>[1]
type ListRequestsQuery = Parameters<RequestsResource['list']>[1]

const FILTER_KEYS = [
  'status',
  'teamId',
  'assigneeId',
  'customerId',
  'categoryId',
  'subcategoryId',
  'ownerId',
  'priority',
] as const

export async function GET(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId } = await context.params
  const filters = Object.fromEntries(
    FILTER_KEYS.flatMap((key) => {
      const value = request.nextUrl.searchParams.get(key)
      return value ? [[key, value]] : []
    })
  ) as ListRequestsQuery
  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const $876 = createConsole876Client(traceId)
  const { data, error } = await $876.requests.list(organizationId, filters)
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to list requests.' },
      { status: 400 }
    )

  return apiJson({ data })
}

export async function POST(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const { id: organizationId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const $876 = createConsole876Client(traceId)
  const { data, error } = await $876.requests.create(
    organizationId,
    body as CreateRequestInput
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to create request.' },
      { status: 400 }
    )

  return apiJson({ data }, { status: 201 })
}
