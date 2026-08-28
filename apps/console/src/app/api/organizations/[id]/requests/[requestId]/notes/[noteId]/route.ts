import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { createConsole876Client } from '@/lib/876'
import { requireConsolePermission } from '@/lib/auth/route-guard'
import type { Console876Client } from '@/lib/876'

export const runtime = 'nodejs'

type Context = {
  params: Promise<{ id: string; requestId: string; noteId: string }>
}
type RequestNotesResource = Console876Client['requestNotes']
type UpdateRequestNoteInput = Parameters<RequestNotesResource['update']>[3]
type DeleteRequestNoteInput = Parameters<RequestNotesResource['delete']>[3]

export async function PATCH(request: NextRequest, context: Context) {
  const { response, sessionUser } = await requireConsolePermission(
    'console:organizations'
  )
  if (response) return response

  const { id: organizationId, requestId, noteId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const $876 = createConsole876Client(traceId)
  const { data, error } = await $876.requestNotes.update(
    organizationId,
    requestId,
    noteId,
    {
      ...(body as UpdateRequestNoteInput),
      editedBy: sessionUser.id,
      includePrivate: true,
    }
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to update request note.' },
      { status: 400 }
    )

  return apiJson({ data })
}

export async function DELETE(request: NextRequest, context: Context) {
  const { response, sessionUser } = await requireConsolePermission(
    'console:organizations'
  )
  if (response) return response

  const { id: organizationId, requestId, noteId } = await context.params
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const $876 = createConsole876Client(traceId)
  const { data, error } = await $876.requestNotes.delete(
    organizationId,
    requestId,
    noteId,
    {
      ...(body as DeleteRequestNoteInput),
      deletedBy: sessionUser.id,
      includePrivate: true,
    }
  )
  if (error || !data)
    return apiJson(
      { error: error?.message ?? 'Failed to delete request note.' },
      { status: 400 }
    )

  return apiJson({ data })
}
