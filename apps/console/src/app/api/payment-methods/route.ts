import { billing } from '@/lib/services/billing'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

function organizationId(request: NextRequest): string | null {
  return request.nextUrl.searchParams.get('organizationId')
}

export async function GET(request: NextRequest): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const orgId = organizationId(request)
  if (!orgId)
    return apiJson({ error: 'organizationId is required.' }, { status: 400 })

  const { data, error } = await billing.paymentMethods.list(orgId, {
    customerId: request.nextUrl.searchParams.get('customerId') ?? undefined,
    limit: request.nextUrl.searchParams.get('limit')
      ? Number(request.nextUrl.searchParams.get('limit'))
      : undefined,
  })
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to list payment methods.' },
      { status: 400 }
    )

  return apiJson({ data })
}

export async function POST(request: NextRequest): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const { organizationId: orgId, ...params } = body as Record<string, unknown>
  if (typeof orgId !== 'string' || !orgId)
    return apiJson({ error: 'organizationId is required.' }, { status: 400 })

  const { data, error } = await billing.paymentMethods.create(
    orgId,
    params as never
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to create payment method.' },
      { status: 400 }
    )

  return apiJson({ data }, { status: 201 })
}
