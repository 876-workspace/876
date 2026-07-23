import { apiError, apiJson } from '@876/core/api'
import type { NoteColor } from '@876/widgets'

import { requireNotepadMember } from '@/lib/widgets-auth'
import { $widgets } from '@/lib/widgets'

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
    return apiError('Invalid JSON body.', { status: 400 })
  }

  const record =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const result = await $widgets.notes.update({ userId: access.userId }, id, {
    title: typeof record.title === 'string' ? record.title : undefined,
    body: typeof record.body === 'string' ? record.body : undefined,
    color:
      typeof record.color === 'string'
        ? (record.color as NoteColor)
        : undefined,
    pinned: typeof record.pinned === 'boolean' ? record.pinned : undefined,
    collection_id:
      record.collection_id === null
        ? null
        : typeof record.collection_id === 'string'
          ? record.collection_id
          : undefined,
  })
  if (result.error)
    return apiError(result.error.message, {
      status: result.error.message.includes('not found') ? 404 : 502,
      code: result.error.code,
    })

  return apiJson({ data: result.data, error: null })
}

export async function DELETE(_request: Request, context: Context) {
  const access = await requireNotepadMember()
  if (access.response) return access.response

  const { id } = await context.params
  const result = await $widgets.notes.delete({ userId: access.userId }, id)
  if (result.error)
    return apiError(result.error.message, {
      status: result.error.message.includes('not found') ? 404 : 502,
      code: result.error.code,
    })

  return apiJson({ data: result.data, error: null })
}
