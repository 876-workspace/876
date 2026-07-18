import { apiError } from '@876/core/api'

import { requireWidgetsService } from '@/lib/auth/service-key'
import { serviceResponse } from '@/lib/http'
import { service } from '@/lib/service'
import { parseColor } from '@/lib/service/notes/validate'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = requireWidgetsService(request)
  if (auth.response) return auth.response

  const url = new URL(request.url)
  const result = await service.notes.listNotes({
    ownerAccountId: auth.actorUserId,
    limit: Number(url.searchParams.get('limit') ?? '') || undefined,
    startingAfter: url.searchParams.get('starting_after') ?? undefined,
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
    return apiError('Invalid JSON body.', { status: 400 })
  }

  const record =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const color = parseColor(record.color)
  if (color && typeof color === 'object' && 'error' in color)
    return serviceResponse(color)

  const result = await service.notes.createNote({
    ownerAccountId: auth.actorUserId,
    title: typeof record.title === 'string' ? record.title : '',
    body: typeof record.body === 'string' ? record.body : '',
    color: typeof color === 'string' ? color : undefined,
    pinned: typeof record.pinned === 'boolean' ? record.pinned : undefined,
  })
  return serviceResponse(result)
}
