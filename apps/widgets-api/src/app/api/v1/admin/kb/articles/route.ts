import { apiError } from '@876/core/api'

import { requireWidgetsService } from '@/lib/auth/service-key'
import { serviceResponse } from '@/lib/http'
import { service } from '@/lib/service'
import {
  isKbAudience,
  isKbHost,
  isKbStatus,
  type KbHost,
} from '@/lib/service/kb'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = requireWidgetsService(request, { admin: true })
  if (auth.response) return auth.response

  const url = new URL(request.url)
  const statusParam = url.searchParams.get('status')
  const hostParam = url.searchParams.get('host')
  const audienceParam = url.searchParams.get('audience')

  const result = await service.kb.articles.listAllArticles({
    actorUserId: auth.actorUserId,
    status: statusParam && isKbStatus(statusParam) ? statusParam : undefined,
    host: hostParam && isKbHost(hostParam) ? hostParam : undefined,
    audience:
      audienceParam && isKbAudience(audienceParam) ? audienceParam : undefined,
    categoryId: url.searchParams.get('category_id') ?? undefined,
    q: url.searchParams.get('q') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
    numItems: Number(url.searchParams.get('limit') ?? '') || undefined,
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

  const result = await service.kb.articles.createArticle({
    actorUserId: auth.actorUserId,
    slug: typeof record.slug === 'string' ? record.slug : '',
    title: typeof record.title === 'string' ? record.title : '',
    summary: typeof record.summary === 'string' ? record.summary : undefined,
    body: typeof record.body === 'string' ? record.body : '',
    categoryId:
      typeof record.category_id === 'string' ? record.category_id : undefined,
    status:
      typeof record.status === 'string' && isKbStatus(record.status)
        ? record.status
        : undefined,
    audience:
      typeof record.audience === 'string' && isKbAudience(record.audience)
        ? record.audience
        : undefined,
    hosts,
    featured:
      typeof record.featured === 'boolean' ? record.featured : undefined,
  })
  return serviceResponse(result)
}
