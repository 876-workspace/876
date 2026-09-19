import { billing } from '@/lib/clients/billing'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

function organizationId(request: NextRequest): string | null {
  return request.nextUrl.searchParams.get('organizationId')
}

export async function GET(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response
  const orgId = organizationId(request)
  if (!orgId)
    return apiJson({ error: 'organizationId is required.' }, { status: 400 })
  const { id } = await context.params
  const { data, error } = await billing.paymentMethods.retrieve(orgId, id)
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to retrieve payment method.' },
      { status: 400 }
    )
  return apiJson({ data })
}

export async function PATCH(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response
  const orgId = organizationId(request)
  const body = await request.json().catch(() => null)
  if (!orgId || !body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request.' }, { status: 400 })
  const { id } = await context.params
  const { data, error } = await billing.paymentMethods.update(
    orgId,
    id,
    body as never
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to update payment method.' },
      { status: 400 }
    )
  return apiJson({ data })
}

export async function DELETE(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response
  const orgId = organizationId(request)
  if (!orgId)
    return apiJson({ error: 'organizationId is required.' }, { status: 400 })
  const { id } = await context.params
  const { data, error } = await billing.paymentMethods.delete(orgId, id)
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to delete payment method.' },
      { status: 400 }
    )
  return apiJson({ data })
}
