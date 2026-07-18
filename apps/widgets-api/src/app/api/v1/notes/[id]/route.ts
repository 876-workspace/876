import { apiError } from '@876/core/api'

import { requireWidgetsService } from '@/lib/auth/service-key'
import { serviceResponse } from '@/lib/http'
import { service } from '@/lib/service'
import { parseColor } from '@/lib/service/notes/validate'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Ctx) {
  const auth = requireWidgetsService(request)
  if (auth.response) return auth.response

  const { id } = await context.params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body.', { status: 400 })
  }

  const record =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const color = parseColor(record.color)
  if (color && typeof color === 'object' && 'error' in color)
    return serviceResponse(color)

  const result = await service.notes.updateNote({
    id,
    ownerAccountId: auth.actorUserId,
    title: typeof record.title === 'string' ? record.title : undefined,
    body: typeof record.body === 'string' ? record.body : undefined,
    color: typeof color === 'string' ? color : undefined,
    pinned: typeof record.pinned === 'boolean' ? record.pinned : undefined,
  })
  return serviceResponse(result)
}

export async function DELETE(_request: Request, context: Ctx) {
  const auth = requireWidgetsService(_request)
  if (auth.response) return auth.response

  const { id } = await context.params
  const result = await service.notes.deleteNote({
    id,
    ownerAccountId: auth.actorUserId,
  })
  return serviceResponse(result)
}
