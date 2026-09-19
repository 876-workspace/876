import { invalidJsonResponse } from '@/lib/errors'

import { requireWidgetsService } from '@/lib/auth/service-key'
import { serviceResponse } from '@/lib/http'
import { records } from '@/lib/records'
import { parseColor } from '@/lib/records/notes/validate'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = requireWidgetsService(request)
  if (auth.response) return auth.response

  const url = new URL(request.url)
  const unfiledParam = url.searchParams.get('unfiled')
  const unfiled =
    unfiledParam === '1' || unfiledParam === 'true' ? true : undefined
  const collectionId = url.searchParams.get('collection_id') ?? undefined

  const result = await records.notes.listNotes({
    ownerAccountId: auth.actorUserId,
    limit: Number(url.searchParams.get('limit') ?? '') || undefined,
    startingAfter: url.searchParams.get('starting_after') ?? undefined,
    collectionId: unfiled ? undefined : collectionId,
    unfiled,
  })
  return serviceResponse(result)
}

export async function POST(request: Request) {
  const auth = requireWidgetsService(request)
  if (auth.response) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return invalidJsonResponse()
  }

  const record =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const color = parseColor(record.color)
  if (color && typeof color === 'object' && 'error' in color)
    return serviceResponse(color)

  const collectionId =
    record.collection_id === null
      ? null
      : typeof record.collection_id === 'string'
        ? record.collection_id
        : undefined

  const result = await records.notes.createNote({
    ownerAccountId: auth.actorUserId,
    title: typeof record.title === 'string' ? record.title : '',
    body: typeof record.body === 'string' ? record.body : '',
    color: typeof color === 'string' ? color : undefined,
    pinned: typeof record.pinned === 'boolean' ? record.pinned : undefined,
    collectionId,
    sourceHost: auth.sourceHost,
  })
  return serviceResponse(result)
}
