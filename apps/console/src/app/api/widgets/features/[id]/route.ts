import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'
import { widgetFeatureUpdateSchema } from '@/types/widgets'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:widgets')
  if (response) return response

  const body = widgetFeatureUpdateSchema.safeParse(
    await request.json().catch(() => null)
  )
  if (!body.success)
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const { id } = await context.params
  const current = await $876.features.retrieve(id)
  if (current.error || !current.data || !current.data.tags.includes('widget')) {
    return apiJson({ error: 'Widget feature not found.' }, { status: 404 })
  }

  const { data, error } = await $876.features.update(id, {
    enabled: body.data.enabled,
  })
  if (error || !data) {
    return apiJson(
      { error: error?.message ?? 'Failed to update widget access.' },
      { status: 400 }
    )
  }
  return apiJson({ data })
}
