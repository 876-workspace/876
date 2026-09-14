import { apiJson } from '@876/core/api'
import type { NoteColor } from '@876/widgets'

import { requireNotepadMember } from '@/lib/widgets-auth'
import { errorResponse } from '@/lib/errors'
import { widgets } from '@/lib/services/widgets'

export const runtime = 'nodejs'

export async function GET() {
  const access = await requireNotepadMember()
  if (access.response) return access.response

  const result = await widgets.collections.list({ userId: access.userId })
  if (result.error) return errorResponse(result.error.code ?? 'error/unknown')
  return apiJson({ data: result.data, error: null })
}

export async function POST(request: Request) {
  const access = await requireNotepadMember()
  if (access.response) return access.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return errorResponse('request/invalid-json')
  }

  const record =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const result = await widgets.collections.create(
    { userId: access.userId },
    {
      name: typeof record.name === 'string' ? record.name : '',
      color:
        record.color === null
          ? null
          : typeof record.color === 'string'
            ? (record.color as NoteColor)
            : undefined,
    }
  )
  if (result.error) return errorResponse(result.error.code ?? 'error/unknown')
  return apiJson({ data: result.data, error: null }, { status: 201 })
}
