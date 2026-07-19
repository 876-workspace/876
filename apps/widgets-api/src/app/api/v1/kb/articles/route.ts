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

  const result = await service.kb.articles.listArticlesForHost({
    actorUserId: auth.actorUserId,
    host,
    maxAudience,
    categoryId: url.searchParams.get('category_id') ?? undefined,
    featuredOnly: url.searchParams.get('featured') === 'true',
    q: url.searchParams.get('q') ?? undefined,
    cursor: url.searchParams.get('cursor') ?? undefined,
    numItems: Number(url.searchParams.get('limit') ?? '') || undefined,
  })
  return serviceResponse(result)
}
