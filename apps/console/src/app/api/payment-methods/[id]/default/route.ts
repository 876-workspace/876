import { billing } from '@/lib/clients/billing'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

export async function POST(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:organizations')
  if (response) return response
  const organizationId = request.nextUrl.searchParams.get('organizationId')
  if (!organizationId)
    return apiJson({ error: 'organizationId is required.' }, { status: 400 })
  const { id } = await context.params
  const { data, error } = await billing.paymentMethods.setDefault(
    organizationId,
    id
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to set default payment method.' },
      { status: 400 }
    )
  return apiJson({ data })
}
