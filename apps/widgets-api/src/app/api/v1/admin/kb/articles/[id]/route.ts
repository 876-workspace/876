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
import { err } from '@/lib/service/result'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: Request, context: Ctx) {
  const auth = requireWidgetsService(request, { admin: true })
  if (auth.response) return auth.response

  const { id } = await context.params
  const result = await service.kb.articles.retrieveArticle({
    actorUserId: auth.actorUserId,
    id,
    isAdmin: true,
  })
  if (result.error) return serviceResponse(result)
  if (!result.data)
    return serviceResponse(
      err('Article not found.', 404, 'widgets/kb-article-not-found')
    )
  return serviceResponse(result)
}

export async function PATCH(request: Request, context: Ctx) {
  const auth = requireWidgetsService(request, { admin: true })
  if (auth.response) return auth.response

  const { id } = await context.params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('Invalid JSON body.', { status: 400 })
  }

  const record =
    body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const hosts =
    record.hosts === undefined
      ? undefined
      : Array.isArray(record.hosts)
        ? record.hosts.filter(
            (h): h is KbHost => typeof h === 'string' && isKbHost(h)
          )
        : undefined

  const result = await service.kb.articles.updateArticle({
    actorUserId: auth.actorUserId,
    id,
    slug: typeof record.slug === 'string' ? record.slug : undefined,
    title: typeof record.title === 'string' ? record.title : undefined,
    summary:
      record.summary === null
        ? null
        : typeof record.summary === 'string'
          ? record.summary
          : undefined,
    body: typeof record.body === 'string' ? record.body : undefined,
    categoryId:
      record.category_id === null
        ? null
        : typeof record.category_id === 'string'
          ? record.category_id
          : undefined,
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

export async function DELETE(request: Request, context: Ctx) {
  const auth = requireWidgetsService(request, { admin: true })
  if (auth.response) return auth.response

  const { id } = await context.params
  const result = await service.kb.articles.deleteArticle({
    actorUserId: auth.actorUserId,
    id,
  })
  return serviceResponse(result)
}
