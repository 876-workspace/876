import { apiError } from '@876/core/api'

import { requireWidgetsService } from '@/lib/auth/service-key'
import { serviceResponse } from '@/lib/http'
import { service } from '@/lib/service'
import { isKbHost, type KbHost } from '@/lib/service/kb'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = requireWidgetsService(request, { admin: true })
  if (auth.response) return auth.response

  const url = new URL(request.url)
  const hostParam = url.searchParams.get('host')
  const result = await service.kb.categories.listAllCategories({
    actorUserId: auth.actorUserId,
    host: hostParam && isKbHost(hostParam) ? hostParam : undefined,
  })
  return serviceResponse(result)
}

export async function POST(request: Request) {
  const auth = requireWidgetsService(request, { admin: true })
  if (auth.response) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body.', { status: 400 })
  }

  const record =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const hostsRaw = Array.isArray(record.hosts) ? record.hosts : []
  const hosts = hostsRaw.filter(
    (h): h is KbHost => typeof h === 'string' && isKbHost(h)
  )

  const result = await service.kb.categories.createCategory({
    actorUserId: auth.actorUserId,
    slug: typeof record.slug === 'string' ? record.slug : '',
    name: typeof record.name === 'string' ? record.name : '',
    description:
      typeof record.description === 'string' ? record.description : undefined,
    parentId:
      typeof record.parent_id === 'string' ? record.parent_id : undefined,
    sortOrder:
      typeof record.sort_order === 'number' ? record.sort_order : undefined,
    hosts,
  })
  return serviceResponse(result)
}
