import { apiError, apiJson } from '@876/core/api'

import { requireConsolePermission } from '@/lib/auth/route-guard'
import { $876 } from '@/lib/876'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Ctx) {
  const access = await requireConsolePermission('console:widgets')
  if (access.response) return access.response

  const { id } = await context.params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body.', { status: 400 })
  }

  const record =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const result = await $876.widgets.notes.update(
    { userId: access.sessionUser.id },
    id,
    {
      title: typeof record.title === 'string' ? record.title : undefined,
      body: typeof record.body === 'string' ? record.body : undefined,
      color:
        typeof record.color === 'string'
          ? (record.color as 'yellow')
          : undefined,
      pinned: typeof record.pinned === 'boolean' ? record.pinned : undefined,
    }
  )
  if (result.error)
    return apiError(result.error.message, {
      status: result.error.message.includes('not found') ? 404 : 502,
      code: result.error.code,
    })
  return apiJson({ data: result.data, error: null })
}

export async function DELETE(_request: Request, context: Ctx) {
  const access = await requireConsolePermission('console:widgets')
  if (access.response) return access.response

  const { id } = await context.params
  const result = await $876.widgets.notes.delete(
    { userId: access.sessionUser.id },
    id
  )
  if (result.error)
    return apiError(result.error.message, {
      status: result.error.message.includes('not found') ? 404 : 502,
      code: result.error.code,
    })
  return apiJson({ data: result.data, error: null })
}
