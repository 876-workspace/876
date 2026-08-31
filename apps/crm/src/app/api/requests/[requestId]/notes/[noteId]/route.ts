import type { NextRequest } from 'next/server'

import { getCrmApiContext } from '@/lib/auth/api-context'
import { crm } from '@/lib/services/crm'

type Context = { params: Promise<{ requestId: string; noteId: string }> }
function statusFor(code: string | undefined) {
  if (code === 'crm/request-not-found' || code === 'crm/request-note-not-found')
    return 404
  if (code === 'crm/description-note-immutable') return 409
  return 400
}
function unauthorized() {
  return Response.json(
    {
      data: null,
      error: { code: 'crm/unauthorized', message: 'Unauthorized.' },
    },
    { status: 401 }
  )
}

export async function PATCH(request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()
  const { requestId, noteId } = await route.params
  const input = (await request.json().catch(() => null)) as {
    body?: string
  } | null
  if (!input?.body?.trim())
    return Response.json(
      {
        data: null,
        error: {
          code: 'crm/invalid-body',
          message: 'Note text cannot be empty.',
        },
      },
      { status: 400 }
    )
  const result = await crm.requestNotes.update(
    context.orgId,
    requestId,
    noteId,
    { body: input.body.trim(), editedBy: context.userId }
  )
  return Response.json(result, {
    status: result.error ? statusFor(result.error.code) : 200,
  })
}

export async function DELETE(_request: NextRequest, route: Context) {
  const context = await getCrmApiContext()
  if (!context) return unauthorized()
  const { requestId, noteId } = await route.params
  const result = await crm.requestNotes.delete(
    context.orgId,
    requestId,
    noteId,
    { deletedBy: context.userId }
  )
  return Response.json(result, {
    status: result.error ? statusFor(result.error.code) : 200,
  })
}
