import { apiJson } from '@876/core/api'
import type { NoteColor } from '@876/widgets'

import { requireNotepadMember } from '@/lib/widgets-auth'
import { errorResponse } from '@/lib/errors'
import { widgets } from '@/lib/services/widgets'

export const runtime = 'nodejs'

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Context) {
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
  const result = await widgets.notes.update({ userId: access.userId }, id, {
    title: typeof record.title === 'string' ? record.title : undefined,
    body: typeof record.body === 'string' ? record.body : undefined,
    color:
      typeof record.color === 'string'
        ? (record.color as NoteColor)
        : undefined,
    pinned: typeof record.pinned === 'boolean' ? record.pinned : undefined,
    collectionId:
      record.collection_id === null
        ? null
        : typeof record.collection_id === 'string'
          ? record.collection_id
          : undefined,
  })
  if (result.error) return errorResponse(result.error.code ?? 'error/unknown')

  return apiJson({ data: result.data, error: null })
}

export async function DELETE(_request: Request, context: Context) {
  const access = await requireNotepadMember()
  if (access.response) return access.response

  const { id } = await context.params
  const result = await widgets.notes.delete({ userId: access.userId }, id)
  if (result.error) return errorResponse(result.error.code ?? 'error/unknown')

  return apiJson({ data: result.data, error: null })
}
