import { invalidJsonResponse } from '@/lib/errors'

import { requireWidgetsService } from '@/lib/auth/service-key'
import { serviceResponse } from '@/lib/http'
import { records } from '@/lib/records'
import { parseCollectionColor } from '@/lib/records/collections/validate'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = requireWidgetsService(request)
  if (auth.response) return auth.response

  const result = await records.collections.listCollections({
    ownerAccountId: auth.actorUserId,
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
  const color = parseCollectionColor(record.color)
  if (color && typeof color === 'object' && 'error' in color)
    return serviceResponse(color)

  const result = await records.collections.createCollection({
    ownerAccountId: auth.actorUserId,
    name: typeof record.name === 'string' ? record.name : '',
    color: color === null || typeof color === 'string' ? color : undefined,
  })
  return serviceResponse(result)
}
