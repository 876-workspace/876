import { platform } from '@/lib/clients/platform'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

/** Adds an additional price to an existing product (e.g. an annual option). */
export async function POST(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { id } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { data, error } = await platform.products.createPrice(id, body)
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to create price.' },
      { status: 400 }
    )
  }

  return apiJson({ data }, { status: 201 })
}
