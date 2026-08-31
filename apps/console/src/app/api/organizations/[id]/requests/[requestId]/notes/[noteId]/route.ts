import type { CrmOperatorClient } from '@876/crm/operator'
import { apiJson } from '@876/core/api'
import type { NextRequest } from 'next/server'

import { requireConsoleCrmPermission } from '@/lib/auth/route-guard'
import { createCrm } from '@/lib/services/crm'

export const runtime = 'nodejs'

type Context = {
  params: Promise<{ id: string; requestId: string; noteId: string }>
}
type RequestNotesResource = CrmOperatorClient['requestNotes']
type UpdateRequestNoteInput = Parameters<RequestNotesResource['update']>[3]
type DeleteRequestNoteInput = Parameters<RequestNotesResource['delete']>[3]

export async function PATCH(request: NextRequest, context: Context) {
  const { id: organizationId, requestId, noteId } = await context.params
  const { response, sessionUser } = await requireConsoleCrmPermission(
    organizationId,
    'notes.edit'
  )
  if (response) return response

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const crm = createCrm(traceId)
  const { data, error } = await crm.requestNotes.update(
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
  const { id: organizationId, requestId, noteId } = await context.params
  const { response, sessionUser } = await requireConsoleCrmPermission(
    organizationId,
    'notes.delete'
  )
  if (response) return response

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object')
    return apiJson({ error: 'Invalid request body.' }, { status: 400 })

  const traceId = request.headers.get('x-request-id') ?? crypto.randomUUID()
  const crm = createCrm(traceId)
  const { data, error } = await crm.requestNotes.delete(
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
