import { platform } from '@/lib/services/platform'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string; priceId: string }> }

/** Updates a price (name, nickname, active, metadata). */
export async function PATCH(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { id, priceId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { data, error } = await platform.products.updatePrice(
    id,
    priceId,
    body
  )
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to update price.' },
      { status: 400 }
    )
  }

  return apiJson({ data })
}

/** Archives a price. */
export async function DELETE(
  _request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { id, priceId } = await context.params
  const { data, error } = await platform.products.archivePrice(id, priceId)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to archive price.' },
      { status: 400 }
    )
  }

  return apiJson({ data })
}
