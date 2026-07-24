import { apiError, apiJson } from '@876/core/api'
import type { NoteColor } from '@876/widgets'

import { requireNotepadMember } from '@/lib/widgets-auth'
import { $widgets } from '@/lib/widgets'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const access = await requireNotepadMember()
  if (access.response) return access.response

  const url = new URL(request.url)
  const unfiledParam = url.searchParams.get('unfiled')
  const unfiled =
    unfiledParam === '1' || unfiledParam === 'true' ? true : undefined

  const result = await $widgets.notes.list(
    { userId: access.userId },
    {
      limit: Number(url.searchParams.get('limit') ?? '') || undefined,
      starting_after: url.searchParams.get('starting_after') ?? undefined,
      collection_id: unfiled
        ? undefined
        : (url.searchParams.get('collection_id') ?? undefined),
      unfiled,
    }
  )
  if (result.error)
    return apiError(result.error.message, {
      status: 502,
      code: result.error.code,
    })
  return apiJson({ data: result.data, error: null })
}

export async function POST(request: Request) {
  const access = await requireNotepadMember()
  if (access.response) return access.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body.', { status: 400 })
  }

  const record =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const result = await $widgets.notes.create(
    { userId: access.userId },
    {
      title: typeof record.title === 'string' ? record.title : '',
      body: typeof record.body === 'string' ? record.body : '',
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
    }
  )
  if (result.error)
    return apiError(result.error.message, {
      status: 502,
      code: result.error.code,
    })
  return apiJson({ data: result.data, error: null }, { status: 201 })
}
