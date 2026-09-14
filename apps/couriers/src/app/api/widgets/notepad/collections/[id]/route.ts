import { apiJson } from '@876/core/api'
import type { NoteColor } from '@876/widgets'

import { requireNotepadMember } from '@/lib/widgets-auth'
import { errorResponse } from '@/lib/errors'
import { widgets } from '@/lib/services/widgets'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Ctx) {
  const access = await requireNotepadMember()
  if (access.response) return access.response

  const { id } = await context.params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('request/invalid-json')
  }

  const record =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const result = await widgets.collections.update(
    { userId: access.userId },
    id,
    {
      name: typeof record.name === 'string' ? record.name : undefined,
      color:
        record.color === null
          ? null
          : typeof record.color === 'string'
            ? (record.color as NoteColor)
            : undefined,
    }
  )
  if (result.error) return errorResponse(result.error.code ?? 'error/unknown')
  return apiJson({ data: result.data, error: null })
}

export async function DELETE(_request: Request, context: Ctx) {
  const access = await requireNotepadMember()
  if (access.response) return access.response

  const { id } = await context.params
  const result = await widgets.collections.delete({ userId: access.userId }, id)
  if (result.error) return errorResponse(result.error.code ?? 'error/unknown')
  return apiJson({ data: result.data, error: null })
}
