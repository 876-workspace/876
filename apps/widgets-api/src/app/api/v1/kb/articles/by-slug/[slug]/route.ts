import { apiError } from '@876/core/api'

import { requireWidgetsService } from '@/lib/auth/service-key'
import { serviceResponse } from '@/lib/http'
import { service } from '@/lib/service'
import { isKbHost } from '@/lib/service/kb'
import { err } from '@/lib/service/result'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ slug: string }> }

export async function GET(request: Request, context: Ctx) {
  const auth = requireWidgetsService(request)
  if (auth.response) return auth.response

  const { slug } = await context.params
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

  const result = await service.kb.articles.retrieveArticleBySlug({
    actorUserId: auth.actorUserId,
    slug: decodeURIComponent(slug),
    host,
    maxAudience,
  })
  if (result.error) return serviceResponse(result)
  if (!result.data)
    return serviceResponse(
      err('Article not found.', 404, 'widgets/kb-article-not-found')
    )
  return serviceResponse(result)
}
