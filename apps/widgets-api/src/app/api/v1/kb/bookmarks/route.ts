import { apiError } from '@876/core/api'

import { requireWidgetsService } from '@/lib/auth/service-key'
import { serviceResponse } from '@/lib/http'
import { service } from '@/lib/service'
import { isKbHost } from '@/lib/service/kb'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = requireWidgetsService(request)
  if (auth.response) return auth.response

  const url = new URL(request.url)
  const host = url.searchParams.get('host') ?? ''
  if (!isKbHost(host))
    return apiError('Query param host is required and must be a valid host.', {
      status: 400,
      code: 'widgets/invalid-host',
    })

  const maxAudience =
    url.searchParams.get('max_audience') === 'platform_admin'
      ? 'platform_admin'
      : url.searchParams.get('max_audience') === 'end_user'
        ? 'end_user'
        : 'org_member'

  const result = await service.kb.bookmarks.listBookmarks({
    actorUserId: auth.actorUserId,
    host,
    maxAudience,
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
  const articleId =
    typeof record.article_id === 'string' ? record.article_id : ''
  const host = typeof record.host === 'string' ? record.host : ''
  if (!articleId)
    return apiError('article_id is required.', {
      status: 400,
      code: 'widgets/invalid-article',
    })
  if (!isKbHost(host))
    return apiError('host is required and must be a valid host.', {
      status: 400,
      code: 'widgets/invalid-host',
    })

  const result = await service.kb.bookmarks.createBookmark({
    actorUserId: auth.actorUserId,
    articleId,
    host,
  })
  return serviceResponse(result)
}
