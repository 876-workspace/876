import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { service } from '@/lib/service'

export const runtime = 'nodejs'

type Context = { params: Promise<{ name: string }> }

/** Updates a role. Persists to MC DB via `client.roles` (Console DB). */
export async function PATCH(
  request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:settings')
  if (response) return response

  const { name } = await context.params
  const body = (await request.json().catch(() => null)) as {
    displayName?: string
    description?: string
    permissions?: string[]
  } | null
  if (!body) return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const result = await service.roles.update(name, body)
  if (result.error) {
    return apiJson({ error: result.error }, { status: result.status ?? 400 })
  }
  return apiJson({ data: result.data })
}

/** Deletes a role. Validates constraints before deletion. */
export async function DELETE(
  _request: NextRequest,
  context: Context
): Promise<Response> {
  const { response } = await requireConsolePermission('console:settings')
  if (response) return response

  const { name } = await context.params
  const result = await service.roles.delete(name)
  if (result.error) {
    return apiJson({ error: result.error }, { status: result.status ?? 400 })
  }
  return apiJson({ data: result.data })
}
