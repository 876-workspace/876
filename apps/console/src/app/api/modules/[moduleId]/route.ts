import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { $876 } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'

export const runtime = 'nodejs'
type Context = { params: Promise<{ moduleId: string }> }

export async function PATCH(request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response
  const { moduleId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid application module.' }, { status: 400 })
  const result = await $876.modules.update(moduleId, body)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to update module.' },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}

export async function DELETE(_request: NextRequest, context: Context) {
  const { response } = await requireConsolePermission('console:apps')
  if (response) return response
  const { moduleId } = await context.params
  const result = await $876.modules.archive(moduleId)
  if (result.error || !result.data)
    return apiJson(
      { error: result.error?.message ?? 'Failed to archive module.' },
      { status: 400 }
    )
  return apiJson({ data: result.data })
}
