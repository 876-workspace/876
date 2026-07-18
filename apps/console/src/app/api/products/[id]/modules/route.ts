import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'

/** Replaces the durable application modules included in a subscription plan. */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (
    !body ||
    typeof body !== 'object' ||
    !Array.isArray(body.module_ids) ||
    body.module_ids.some((moduleId: unknown) => typeof moduleId !== 'string')
  )
    return apiJson(
      { error: 'module_ids must be an array of IDs.' },
      { status: 400 }
    )

  const { data, error } = await $876.products.replaceModules(id, {
    module_ids: body.module_ids,
  })
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to update plan modules.' },
      { status: 400 }
    )

  return apiJson({ data })
}
